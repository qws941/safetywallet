const TRL_PREFIX = "trl:";
const TRL_TTL_SECONDS = 86400;

export async function addToRevocationList(
  kv: KVNamespace,
  userId: string,
): Promise<void> {
  await kv.put(`${TRL_PREFIX}${userId}`, "1", {
    expirationTtl: TRL_TTL_SECONDS,
  });
}

export async function isRevoked(
  kv: KVNamespace,
  userId: string,
): Promise<boolean> {
  const val = await kv.get(`${TRL_PREFIX}${userId}`);
  return val !== null;
}

export async function removeFromRevocationList(
  kv: KVNamespace,
  userId: string,
): Promise<void> {
  await kv.delete(`${TRL_PREFIX}${userId}`);
}
