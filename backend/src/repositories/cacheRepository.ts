/**
 * Entry stored in the in-memory cache.
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * CacheRepository - in-memory cache with TTL support.
 *
 * Uses a simple Map as the backing store. No Redis dependency required.
 * Expired entries are lazily evicted on access.
 */
export class CacheRepository {
  private store = new Map<string, CacheEntry<unknown>>();

  /**
   * Get a cached value. Returns `null` if the key does not exist or has expired.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set a value in the cache with a TTL in seconds.
   */
  set<T>(key: string, value: T, ttlSeconds: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Generate a deterministic cache key from parts.
   */
  generateKey(...parts: string[]): string {
    return parts.join(":");
  }
}
