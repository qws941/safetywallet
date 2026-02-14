/**
 * Generate a PBKDF2 hash for the admin password.
 *
 * Usage:
 *   npx tsx scripts/hash-admin-password.ts <password>
 *
 * Then set the result as a Wrangler secret:
 *   echo '<output>' | npx wrangler secret put ADMIN_PASSWORD_HASH
 */

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    KEY_BYTES * 8,
  );
  const saltB64 = bytesToBase64(salt);
  const hashB64 = bytesToBase64(new Uint8Array(derived));
  return `pbkdf2:${PBKDF2_ITERATIONS}:${saltB64}:${hashB64}`;
}

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error("Usage: npx tsx scripts/hash-admin-password.ts <password>");
    process.exit(1);
  }

  const hash = await hashPassword(password);
  console.log(hash);
}

main();
