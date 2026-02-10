/**
 * Web Push implementation for Cloudflare Workers using Web Crypto API.
 * Implements RFC 8291 (Message Encryption for Web Push) and RFC 8292 (VAPID).
 */

// --- Base64URL helpers ---

export function base64UrlDecode(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (base64.length % 4)) % 4;
  const padded = base64 + "=".repeat(pad);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// --- Byte manipulation ---

function concatBuffers(...buffers: Uint8Array[]): Uint8Array {
  const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const b of buffers) {
    result.set(b, offset);
    offset += b.length;
  }
  return result;
}

function lengthPrefixed(data: Uint8Array): Uint8Array {
  const len = new Uint8Array(2);
  new DataView(len.buffer).setUint16(0, data.length, false);
  return concatBuffers(len, data);
}

// --- HKDF (RFC 5869) ---

async function hkdfExtract(
  salt: Uint8Array,
  ikm: Uint8Array,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    salt,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const prk = await crypto.subtle.sign("HMAC", key, ikm);
  return new Uint8Array(prk);
}

async function hkdfExpand(
  prk: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const infoWithCounter = concatBuffers(info, new Uint8Array([1]));
  const output = await crypto.subtle.sign("HMAC", key, infoWithCounter);
  return new Uint8Array(output).slice(0, length);
}

// --- VAPID JWT (RFC 8292) ---

export async function generateVapidHeaders(
  publicKeyBase64: string,
  privateKeyBase64: string,
  endpoint: string,
): Promise<{ authorization: string; "Crypto-Key": string }> {
  const audience = new URL(endpoint).origin;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60;

  const header = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })),
  );
  const payload = base64UrlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        aud: audience,
        exp: expiration,
        sub: "mailto:admin@safework2.jclee.me",
      }),
    ),
  );

  const unsignedToken = `${header}.${payload}`;

  const privateKeyBytes = base64UrlDecode(privateKeyBase64);
  const key = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: publicKeyBase64.slice(0, 43),
      y: publicKeyBase64.slice(43),
      d: base64UrlEncode(privateKeyBytes),
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken),
  );

  // Convert DER signature to raw r||s format (64 bytes)
  const sigBytes = new Uint8Array(signature);
  let rawSig: Uint8Array;
  if (sigBytes.length === 64) {
    rawSig = sigBytes;
  } else {
    rawSig = derToRaw(sigBytes);
  }

  const token = `${unsignedToken}.${base64UrlEncode(rawSig)}`;

  return {
    authorization: `vapid t=${token}, k=${publicKeyBase64}`,
    "Crypto-Key": `p256ecdsa=${publicKeyBase64}`,
  };
}

function derToRaw(der: Uint8Array): Uint8Array {
  const raw = new Uint8Array(64);
  // DER: 0x30 <len> 0x02 <rLen> <r> 0x02 <sLen> <s>
  let offset = 2;
  const rLen = der[offset + 1];
  const rStart = offset + 2 + (rLen > 32 ? rLen - 32 : 0);
  const rCopyLen = Math.min(rLen, 32);
  raw.set(der.slice(rStart, rStart + rCopyLen), 32 - rCopyLen);

  offset = offset + 2 + rLen;
  const sLen = der[offset + 1];
  const sStart = offset + 2 + (sLen > 32 ? sLen - 32 : 0);
  const sCopyLen = Math.min(sLen, 32);
  raw.set(der.slice(sStart, sStart + sCopyLen), 64 - sCopyLen);

  return raw;
}

// --- RFC 8291 Web Push Encryption ---

export interface WebPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function encryptPayload(
  subscription: WebPushSubscription,
  payloadText: string,
): Promise<{ body: Uint8Array; localPublicKey: Uint8Array; salt: Uint8Array }> {
  const payload = new TextEncoder().encode(payloadText);

  const subscriberKeyBytes = base64UrlDecode(subscription.keys.p256dh);
  const authSecret = base64UrlDecode(subscription.keys.auth);

  const subscriberPublicKey = await crypto.subtle.importKey(
    "raw",
    subscriberKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  const localKeyPair = (await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  )) as CryptoKeyPair;

  const sharedSecretBits = await crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: subscriberPublicKey,
    } as { name: string; public: CryptoKey },
    localKeyPair.privateKey,
    256,
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  const localPublicKeyRaw = await crypto.subtle.exportKey(
    "raw",
    localKeyPair.publicKey,
  );
  const localPublicKey = new Uint8Array(localPublicKeyRaw as ArrayBuffer);

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // RFC 8291 key derivation
  const encoder = new TextEncoder();
  const keyInfoPrefix = encoder.encode("WebPush: info\0");
  const keyInfo = concatBuffers(
    keyInfoPrefix,
    subscriberKeyBytes,
    localPublicKey,
  );

  const prk = await hkdfExtract(authSecret, sharedSecret);
  const ikm = await hkdfExpand(prk, keyInfo, 32);

  const cekInfo = encoder.encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = encoder.encode("Content-Encoding: nonce\0");

  const prk2 = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(prk2, cekInfo, 16);
  const nonce = await hkdfExpand(prk2, nonceInfo, 12);

  // Import content encryption key
  const contentKey = await crypto.subtle.importKey(
    "raw",
    cek,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  // Pad and encrypt (RFC 8188 delimiter byte = 0x02 for final record)
  const paddedPayload = concatBuffers(payload, new Uint8Array([2]));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    contentKey,
    paddedPayload,
  );

  // Build aes128gcm body: salt(16) + rs(4) + keyIdLen(1) + keyId(65) + ciphertext
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096, false);
  const keyIdLen = new Uint8Array([localPublicKey.length]);

  const body = concatBuffers(
    salt,
    recordSize,
    keyIdLen,
    localPublicKey,
    new Uint8Array(ciphertext),
  );

  return { body, localPublicKey, salt };
}
