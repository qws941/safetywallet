const IN_QUERY_CHUNK_SIZE = 50;

function normalizeAccsDay(value: string | undefined): string | null {
  if (!value) return null;
  if (/^\d{8}$/.test(value)) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value.replace(/-/g, "");
  }
  return null;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export { IN_QUERY_CHUNK_SIZE, normalizeAccsDay, chunkArray };
