import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  base64urlEncode,
  base64urlDecode,
  shouldRemoveSubscription,
  isRetryableError,
  type PushResult,
} from "../web-push";
import {
  createVapidJwt,
  encryptPayload,
  sendPushNotification,
  sendPushBulk,
  generateVapidKeys,
  type PushMessage,
  type PushSubscription,
  type VapidKeys,
} from "../web-push";

describe("base64urlEncode", () => {
  it("encodes ArrayBuffer to base64url string", () => {
    const data = new TextEncoder().encode("Hello, World!");
    const encoded = base64urlEncode(data);
    expect(encoded).toBe("SGVsbG8sIFdvcmxkIQ");
  });

  it("encodes Uint8Array to base64url string", () => {
    const data = new Uint8Array([0, 1, 2, 3, 255]);
    const encoded = base64urlEncode(data);
    expect(encoded).toBeTruthy();
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
    expect(encoded).not.toContain("=");
  });

  it("encodes empty buffer", () => {
    const data = new Uint8Array(0);
    expect(base64urlEncode(data)).toBe("");
  });

  it("handles ArrayBuffer input", () => {
    const data = new Uint8Array([65, 66, 67]).buffer;
    const encoded = base64urlEncode(data);
    expect(encoded).toBe("QUJD");
  });
});

describe("base64urlDecode", () => {
  it("decodes base64url string to Uint8Array", () => {
    const decoded = base64urlDecode("SGVsbG8sIFdvcmxkIQ");
    expect(new TextDecoder().decode(decoded)).toBe("Hello, World!");
  });

  it("handles standard base64 with padding", () => {
    const decoded = base64urlDecode("QUJD");
    expect(Array.from(decoded)).toEqual([65, 66, 67]);
  });

  it("roundtrips with encode", () => {
    const original = new Uint8Array([0, 128, 255, 1, 254]);
    const encoded = base64urlEncode(original);
    const decoded = base64urlDecode(encoded);
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });

  it("handles base64url with - and _", () => {
    const encoded = base64urlEncode(new Uint8Array([251, 239, 191]));
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
    const decoded = base64urlDecode(encoded);
    expect(Array.from(decoded)).toEqual([251, 239, 191]);
  });
});

describe("shouldRemoveSubscription", () => {
  it("returns true for 404 status", () => {
    const result: PushResult = {
      success: false,
      statusCode: 404,
      endpoint: "https://push.example.com/sub/1",
      error: "Not Found",
    };
    expect(shouldRemoveSubscription(result)).toBe(true);
  });

  it("returns true for 410 Gone status", () => {
    const result: PushResult = {
      success: false,
      statusCode: 410,
      endpoint: "https://push.example.com/sub/1",
      error: "Gone",
    };
    expect(shouldRemoveSubscription(result)).toBe(true);
  });

  it("returns false for other status codes", () => {
    const result: PushResult = {
      success: false,
      statusCode: 500,
      endpoint: "https://push.example.com/sub/1",
      error: "Server Error",
    };
    expect(shouldRemoveSubscription(result)).toBe(false);
  });

  it("returns false for successful result", () => {
    const result: PushResult = {
      success: true,
      statusCode: 201,
      endpoint: "https://push.example.com/sub/1",
    };
    expect(shouldRemoveSubscription(result)).toBe(false);
  });
});

describe("isRetryableError", () => {
  it("returns true for 429 rate limit", () => {
    const result: PushResult = {
      success: false,
      statusCode: 429,
      endpoint: "https://push.example.com/sub/1",
      error: "Too Many Requests",
    };
    expect(isRetryableError(result)).toBe(true);
  });

  it("returns true for 5xx server errors", () => {
    for (const code of [500, 502, 503, 504]) {
      const result: PushResult = {
        success: false,
        statusCode: code,
        endpoint: "https://push.example.com/sub/1",
        error: "Server Error",
      };
      expect(isRetryableError(result)).toBe(true);
    }
  });

  it("returns false for 4xx client errors (except 429)", () => {
    for (const code of [400, 401, 403, 404, 410]) {
      const result: PushResult = {
        success: false,
        statusCode: code,
        endpoint: "https://push.example.com/sub/1",
        error: "Client Error",
      };
      expect(isRetryableError(result)).toBe(false);
    }
  });

  it("returns false for 0 (network error)", () => {
    const result: PushResult = {
      success: false,
      statusCode: 0,
      endpoint: "https://push.example.com/sub/1",
      error: "Network Error",
    };
    expect(isRetryableError(result)).toBe(false);
  });
});

function decodeJwtSegment(segment: string): Record<string, unknown> {
  const decoded = base64urlDecode(segment);
  return JSON.parse(new TextDecoder().decode(decoded)) as Record<
    string,
    unknown
  >;
}

const realSubtleImportKey = crypto.subtle.importKey.bind(crypto.subtle);

async function createClientPushKeys(): Promise<PushSubscription["keys"]> {
  const keyPair = (await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  )) as CryptoKeyPair;

  const publicKey = (await crypto.subtle.exportKey(
    "raw",
    keyPair.publicKey,
  )) as ArrayBuffer;

  const authSecret = crypto.getRandomValues(new Uint8Array(16));

  return {
    p256dh: base64urlEncode(publicKey),
    auth: base64urlEncode(authSecret),
  };
}

async function createSubscription(endpoint: string): Promise<PushSubscription> {
  return {
    endpoint,
    keys: await createClientPushKeys(),
  };
}

async function installNodeVapidCryptoCompatMocks(): Promise<void> {
  const ecdhPair = (await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  )) as CryptoKeyPair;
  const ecdsaPair = (await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;

  vi.spyOn(crypto.subtle, "importKey").mockImplementation(
    async (format, keyData, algorithm, extractable, keyUsages) => {
      if (
        format === "pkcs8" &&
        typeof algorithm === "object" &&
        "name" in algorithm &&
        algorithm.name === "ECDH"
      ) {
        return ecdhPair.privateKey;
      }

      if (
        format === "jwk" &&
        typeof algorithm === "object" &&
        "name" in algorithm &&
        algorithm.name === "ECDSA"
      ) {
        return ecdsaPair.privateKey;
      }

      return realSubtleImportKey(
        format,
        keyData,
        algorithm,
        extractable,
        keyUsages,
      );
    },
  );
}

describe("createVapidJwt", () => {
  it("creates ES256 JWT with expected claims and expiration", async () => {
    vi.restoreAllMocks();

    await installNodeVapidCryptoCompatMocks();

    const vapidKeys = await generateVapidKeys();
    const audience = "https://fcm.googleapis.com";
    const subject = "mailto:test@safetywallet.dev";

    const token = await createVapidJwt(
      audience,
      subject,
      vapidKeys.privateKey,
      60,
    );

    const segments = token.split(".");
    expect(segments).toHaveLength(3);

    const header = decodeJwtSegment(segments[0]);
    const payload = decodeJwtSegment(segments[1]);
    const signature = base64urlDecode(segments[2]);

    expect(header).toEqual({ typ: "JWT", alg: "ES256" });
    expect(payload.aud).toBe(audience);
    expect(payload.sub).toBe(subject);

    const now = Math.floor(Date.now() / 1000);
    expect(typeof payload.exp).toBe("number");
    expect((payload.exp as number) - now).toBeGreaterThanOrEqual(55);
    expect((payload.exp as number) - now).toBeLessThanOrEqual(65);

    expect(signature.byteLength).toBeGreaterThan(0);
  });
});

describe("encryptPayload", () => {
  it("produces aes128gcm payload with RFC 8291 header fields", async () => {
    const clientKeys = await createClientPushKeys();
    const plaintext = JSON.stringify({ title: "안전 알림", body: "테스트" });

    const { encrypted, serverPublicKey } = await encryptPayload(
      plaintext,
      clientKeys.p256dh,
      clientKeys.auth,
    );

    expect(serverPublicKey).toHaveLength(65);
    expect(encrypted.byteLength).toBeGreaterThan(16 + 4 + 1 + 65);

    const view = new DataView(
      encrypted.buffer,
      encrypted.byteOffset,
      encrypted.byteLength,
    );
    const recordSize = view.getUint32(16, false);
    const keyIdLength = encrypted[20];
    const headerServerPublicKey = encrypted.slice(21, 21 + keyIdLength);

    expect(recordSize).toBe(4096);
    expect(keyIdLength).toBe(serverPublicKey.length);
    expect(Array.from(headerServerPublicKey)).toEqual(
      Array.from(serverPublicKey),
    );
  });
});

describe("sendPushNotification", () => {
  const message: PushMessage = {
    title: "새 알림",
    body: "현장 안전 점검",
    data: { shift: "A" },
  };

  let vapidKeys: VapidKeys;
  let subscription: PushSubscription;

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    await installNodeVapidCryptoCompatMocks();
    vapidKeys = await generateVapidKeys();
    subscription = await createSubscription(
      "https://push.example.com/subscriptions/123",
    );
  });

  it("returns success for 201 Created", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendPushNotification(subscription, message, vapidKeys);

    expect(result).toEqual({
      success: true,
      statusCode: 201,
      endpoint: subscription.endpoint,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("returns success for 200 OK", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendPushNotification(
      subscription,
      message,
      vapidKeys,
      "mailto:alerts@safetywallet.dev",
    );

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
  });

  it("returns expiration error for 410 Gone", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("gone", { status: 410 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendPushNotification(subscription, message, vapidKeys);

    expect(result).toEqual({
      success: false,
      statusCode: 410,
      endpoint: subscription.endpoint,
      error: "Subscription expired or invalid",
    });
  });

  it("returns expiration error for 404 Not Found", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("missing", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendPushNotification(subscription, message, vapidKeys);

    expect(result.statusCode).toBe(404);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Subscription expired or invalid");
  });

  it("returns retryable error details for 429 and 500", async () => {
    const status429 = new Response("too many requests", { status: 429 });
    const status500 = new Response(null, { status: 500 });
    Object.defineProperty(status500, "text", {
      value: vi.fn().mockRejectedValue(new Error("no-body")),
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(status429)
      .mockResolvedValueOnce(status500);
    vi.stubGlobal("fetch", fetchMock);

    const retryResult = await sendPushNotification(
      subscription,
      message,
      vapidKeys,
    );
    const serverErrorResult = await sendPushNotification(
      subscription,
      message,
      vapidKeys,
    );

    expect(retryResult.success).toBe(false);
    expect(retryResult.statusCode).toBe(429);
    expect(retryResult.error).toContain("Push service returned 429");

    expect(serverErrorResult.success).toBe(false);
    expect(serverErrorResult.statusCode).toBe(500);
    expect(serverErrorResult.error).toBe("Push service returned 500: ");
  });

  it("returns network-style error when fetch throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendPushNotification(subscription, message, vapidKeys);

    expect(result).toEqual({
      success: false,
      statusCode: 0,
      endpoint: subscription.endpoint,
      error: "network down",
    });
  });

  it("normalizes non-Error thrown values", async () => {
    const fetchMock = vi.fn().mockRejectedValue("network-string");
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendPushNotification(subscription, message, vapidKeys);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(0);
    expect(result.error).toBe("network-string");
  });
});

describe("sendPushBulk", () => {
  const message: PushMessage = {
    title: "일괄 알림",
    body: "안전 점검 일괄 발송",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns empty results for empty subscriptions", async () => {
    await installNodeVapidCryptoCompatMocks();

    const vapidKeys = await generateVapidKeys();
    const results = await sendPushBulk([], message, vapidKeys);
    expect(results).toEqual([]);
  });

  it("returns mixed results from parallel sends", async () => {
    await installNodeVapidCryptoCompatMocks();

    const vapidKeys = await generateVapidKeys();
    const sub1 = await createSubscription("https://push.example.com/sub/1");
    const sub2 = await createSubscription("https://push.example.com/sub/2");
    const sub3 = await createSubscription("https://push.example.com/sub/3");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 201 }))
      .mockResolvedValueOnce(new Response("gone", { status: 410 }))
      .mockResolvedValueOnce(new Response("retry", { status: 429 }));

    vi.stubGlobal("fetch", fetchMock);

    const results = await sendPushBulk([sub1, sub2, sub3], message, vapidKeys);

    expect(results).toHaveLength(3);
    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ success: true, statusCode: 201 }),
        expect.objectContaining({ success: false, statusCode: 410 }),
        expect.objectContaining({ success: false, statusCode: 429 }),
      ]),
    );
    expect(results.map((result) => result.endpoint).sort()).toEqual(
      [sub1.endpoint, sub2.endpoint, sub3.endpoint].sort(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("maps rejected send results into PushResult shape", async () => {
    await installNodeVapidCryptoCompatMocks();

    const vapidKeys = await generateVapidKeys();
    const validSub = await createSubscription(
      "https://push.example.com/sub/ok",
    );
    let endpointAccessCount = 0;
    const invalidSub: PushSubscription = {
      get endpoint(): string {
        endpointAccessCount += 1;
        if (endpointAccessCount === 2 || endpointAccessCount === 3) {
          throw new Error("endpoint getter failed");
        }
        return "https://push.example.com/sub/broken";
      },
      keys: await createClientPushKeys(),
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const results = await sendPushBulk(
      [validSub, invalidSub],
      message,
      vapidKeys,
    );

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      success: true,
      statusCode: 201,
      endpoint: validSub.endpoint,
    });
    expect(results[1].success).toBe(false);
    expect(results[1].statusCode).toBe(0);
    expect(results[1].error).toBe("endpoint getter failed");
  });

  it("maps non-Error rejection reasons via String conversion", async () => {
    await installNodeVapidCryptoCompatMocks();

    const vapidKeys = await generateVapidKeys();
    const validSub = await createSubscription(
      "https://push.example.com/sub/non-error-ok",
    );
    let endpointAccessCount = 0;
    const invalidSub: PushSubscription = {
      get endpoint(): string {
        endpointAccessCount += 1;
        if (endpointAccessCount === 2 || endpointAccessCount === 3) {
          throw "string rejection";
        }
        return "https://push.example.com/sub/non-error-broken";
      },
      keys: await createClientPushKeys(),
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const results = await sendPushBulk(
      [validSub, invalidSub],
      message,
      vapidKeys,
    );

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(false);
    expect(results[1].statusCode).toBe(0);
    expect(results[1].error).toBe("string rejection");
  });
});

describe("generateVapidKeys", () => {
  it("creates base64url public/private keys with expected lengths", async () => {
    const keys = await generateVapidKeys();

    expect(keys.publicKey).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(keys.privateKey).toMatch(/^[A-Za-z0-9_-]+$/);

    const publicKeyBytes = base64urlDecode(keys.publicKey);
    const privateKeyBytes = base64urlDecode(keys.privateKey);

    expect(publicKeyBytes).toHaveLength(65);
    expect(privateKeyBytes).toHaveLength(32);
  });
});
