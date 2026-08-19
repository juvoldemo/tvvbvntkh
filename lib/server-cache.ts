type Entry<T> = {
  expiresAt: number;
  value: Promise<T>;
};

const entries = new Map<string, Entry<unknown>>();
const MAX_ENTRIES = 500;

/**
 * Small per-instance cache for read-heavy API data. Storing the promise also
 * coalesces simultaneous misses, preventing a burst of identical DB queries.
 */
export function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const existing = entries.get(key) as Entry<T> | undefined;
  if (existing && existing.expiresAt > now) return existing.value;

  if (entries.size >= MAX_ENTRIES) {
    for (const [entryKey, entry] of entries) {
      if (entry.expiresAt <= now || entries.size >= MAX_ENTRIES) entries.delete(entryKey);
      if (entries.size < MAX_ENTRIES) break;
    }
  }

  const value = loader().catch((error) => {
    entries.delete(key);
    throw error;
  });
  entries.set(key, { expiresAt: now + ttlMs, value });
  return value;
}

export function clearCached(prefix: string) {
  for (const key of entries.keys()) {
    if (key.startsWith(prefix)) entries.delete(key);
  }
}
