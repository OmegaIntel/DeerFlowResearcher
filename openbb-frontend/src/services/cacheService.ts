/**
 * Cache Service for API Data
 * Implements LRU cache with TTL support
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheService {
  private cache: Map<string, CacheItem<any>>;
  private maxSize: number;
  private storage: Storage | null;

  constructor(maxSize: number = 100, useLocalStorage: boolean = true) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.storage = useLocalStorage && typeof window !== 'undefined' ? window.localStorage : null;
    
    // Load cache from storage on initialization
    this.loadFromStorage();
  }

  /**
   * Generate cache key from endpoint and params
   */
  generateKey(endpoint: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${endpoint}?${sortedParams}`;
  }

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if item has expired
    const now = Date.now();
    if (now - item.timestamp > item.ttl * 1000) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, item);

    return item.data as T;
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, ttl: number = 300): void {
    // Ensure cache size limit
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    this.saveToStorage();
  }

  /**
   * Clear specific cache entries by pattern
   */
  clearByPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      if (key) {
        this.cache.delete(key);
      }
    });
    this.saveToStorage();
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
    if (this.storage) {
      this.storage.removeItem('openbb_api_cache');
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let validCount = 0;
    let expiredCount = 0;
    let totalSize = 0;

    this.cache.forEach((item) => {
      if (now - item.timestamp <= item.ttl * 1000) {
        validCount++;
      } else {
        expiredCount++;
      }
      totalSize += JSON.stringify(item.data).length;
    });

    return {
      totalEntries: this.cache.size,
      validEntries: validCount,
      expiredEntries: expiredCount,
      approximateSizeKB: Math.round(totalSize / 1024)
    };
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    if (!this.storage) return;

    try {
      const cacheData: Record<string, CacheItem<any>> = {};
      this.cache.forEach((value, key) => {
        cacheData[key] = value;
      });
      
      this.storage.setItem('openbb_api_cache', JSON.stringify(cacheData));
    } catch (e) {
      console.warn('Failed to save cache to storage:', e);
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    if (!this.storage) return;

    try {
      const stored = this.storage.getItem('openbb_api_cache');
      if (stored) {
        const cacheData = JSON.parse(stored);
        const now = Date.now();

        // Only load non-expired items
        Object.entries(cacheData).forEach(([key, item]: [string, any]) => {
          if (now - item.timestamp <= item.ttl * 1000) {
            this.cache.set(key, item);
          }
        });
      }
    } catch (e) {
      console.warn('Failed to load cache from storage:', e);
    }
  }
}

// Singleton instance
export const apiCache = new CacheService();
export default apiCache;

/**
 * Cache decorator for API functions
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  getCacheKey: (...args: Parameters<T>) => string,
  ttl: number = 300
): T {
  return (async (...args: Parameters<T>) => {
    const cacheKey = getCacheKey(...args);
    
    // Try to get from cache
    const cached = apiCache.get(cacheKey);
    if (cached !== null) {
      console.log(`Cache hit: ${cacheKey}`);
      return cached;
    }

    // Fetch fresh data
    console.log(`Cache miss: ${cacheKey}`);
    const result = await fn(...args);
    
    // Store in cache
    apiCache.set(cacheKey, result, ttl);
    
    return result;
  }) as T;
}