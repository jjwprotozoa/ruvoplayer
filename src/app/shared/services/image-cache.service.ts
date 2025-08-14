import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { catchError, map, mergeMap, switchMap, tap, toArray } from 'rxjs/operators';

export interface CachedImage {
  url: string;
  dataUrl: string;
  timestamp: number;
  size: number;
  lastAccessed: number;
  accessCount: number;
}

export interface CacheStats {
  totalImages: number;
  totalSize: number;
  maxSize: number;
  hitRate: number;
  missCount: number;
  hitCount: number;
}

export interface CacheConfig {
  maxSize: number; // in bytes
  maxImages: number;
  ttl: number; // time to live in milliseconds
  enableCompression: boolean;
  compressionQuality: number; // 0.1 to 1.0
}

@Injectable({
  providedIn: 'root'
})
export class ImageCacheService {
  private cache = new Map<string, CachedImage>();
  private cacheConfig: CacheConfig = {
    maxSize: 100 * 1024 * 1024, // 100MB default
    maxImages: 1000,
    ttl: 24 * 60 * 60 * 1000, // 24 hours default
    enableCompression: true,
    compressionQuality: 0.8
  };

  private stats = {
    hitCount: 0,
    missCount: 0,
    totalRequests: 0
  };

  private cacheStats$ = new BehaviorSubject<CacheStats>(this.getCacheStats());
  private isInitialized = false;

  constructor(private ngZone: NgZone) {
    this.initializeCache();
  }

  /**
   * Initialize the cache from localStorage if available
   */
  private async initializeCache(): Promise<void> {
    try {
      const savedCache = localStorage.getItem('image-cache');
      const savedConfig = localStorage.getItem('image-cache-config');
      
      if (savedConfig) {
        this.cacheConfig = { ...this.cacheConfig, ...JSON.parse(savedConfig) };
      }

      if (savedCache) {
        const parsedCache = JSON.parse(savedCache);
        // Only restore cache entries that haven't expired
        const now = Date.now();
        for (const [url, cachedImage] of Object.entries(parsedCache)) {
          const typedCachedImage = cachedImage as CachedImage;
          if (now - typedCachedImage.timestamp < this.cacheConfig.ttl) {
            this.cache.set(url, typedCachedImage);
          }
        }
      }

      this.isInitialized = true;
      this.updateCacheStats();
      this.cleanupExpiredCache();
    } catch (error) {
      console.error('Failed to initialize image cache:', error);
      this.isInitialized = true;
    }
  }

  /**
   * Get an image from cache or load and cache it
   */
  getImage(url: string): Observable<string> {
    if (!this.isInitialized) {
      return this.waitForInitialization().pipe(
        switchMap(() => this.getImage(url))
      );
    }

    this.stats.totalRequests++;
    
    // Check if image is in cache
    const cached = this.cache.get(url);
    if (cached) {
      // Check if cache entry has expired
      if (Date.now() - cached.timestamp < this.cacheConfig.ttl) {
        // Update access info
        cached.lastAccessed = Date.now();
        cached.accessCount++;
        this.cache.set(url, cached);
        this.stats.hitCount++;
        this.updateCacheStats();
        return of(cached.dataUrl);
      } else {
        // Remove expired entry
        this.cache.delete(url);
      }
    }

    this.stats.missCount++;
    this.updateCacheStats();

    // Load and cache the image
    return this.loadAndCacheImage(url);
  }

  /**
   * Load an image and cache it
   */
  private loadAndCacheImage(url: string): Observable<string> {
    return from(this.fetchImageAsDataUrl(url)).pipe(
      tap(dataUrl => {
        this.cacheImage(url, dataUrl);
      }),
      catchError(error => {
        console.error(`Failed to load image: ${url}`, error);
        // Return a placeholder or throw the error
        throw error;
      })
    );
  }

  /**
   * Fetch image and convert to data URL
   */
  private async fetchImageAsDataUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Set canvas dimensions
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;

          // Draw image to canvas
          ctx.drawImage(img, 0, 0);

          // Compress if enabled
          let quality = 1.0;
          if (this.cacheConfig.enableCompression) {
            quality = this.cacheConfig.compressionQuality;
          }

          // Convert to data URL
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${url}`));
      };

      img.src = url;
    });
  }

  /**
   * Cache an image
   */
  private cacheImage(url: string, dataUrl: string): void {
    const size = this.calculateDataUrlSize(dataUrl);
    
    // Check if we need to make space
    this.ensureCacheSpace(size);

    const cachedImage: CachedImage = {
      url,
      dataUrl,
      timestamp: Date.now(),
      size,
      lastAccessed: Date.now(),
      accessCount: 1
    };

    this.cache.set(url, cachedImage);
    this.updateCacheStats();
    this.persistCache();
  }

  /**
   * Ensure there's enough space in the cache
   */
  private ensureCacheSpace(requiredSize: number): void {
    if (requiredSize > this.cacheConfig.maxSize) {
      // Image is too large, can't cache it
      return;
    }

    let currentSize = this.getCurrentCacheSize();
    let currentCount = this.cache.size;

    // Remove items until we have enough space
    while ((currentSize + requiredSize > this.cacheConfig.maxSize || 
            currentCount >= this.cacheConfig.maxImages) && 
           this.cache.size > 0) {
      
      // Find the least recently used item
      let lruUrl = '';
      let lruScore = Infinity;
      
      for (const [url, cachedImage] of this.cache.entries()) {
        const score = this.calculateLRUScore(cachedImage);
        if (score < lruScore) {
          lruScore = score;
          lruUrl = url;
        }
      }

      if (lruUrl) {
        const removed = this.cache.get(lruUrl);
        if (removed) {
          currentSize -= removed.size;
          currentCount--;
        }
        this.cache.delete(lruUrl);
      }
    }
  }

  /**
   * Calculate LRU score (lower = less recently used)
   */
  private calculateLRUScore(cachedImage: CachedImage): number {
    const now = Date.now();
    const timeSinceLastAccess = now - cachedImage.lastAccessed;
    const accessWeight = 1 / (cachedImage.accessCount + 1);
    
    // Combine time and access frequency
    return timeSinceLastAccess * accessWeight;
  }

  /**
   * Calculate size of data URL in bytes
   */
  private calculateDataUrlSize(dataUrl: string): number {
    // Remove data URL prefix to get base64 string
    const base64 = dataUrl.split(',')[1];
    if (!base64) return 0;
    
    // Calculate size: base64 is 4/3 of the actual size
    return Math.ceil((base64.length * 3) / 4);
  }

  /**
   * Get current cache size in bytes
   */
  private getCurrentCacheSize(): number {
    let totalSize = 0;
    for (const cachedImage of this.cache.values()) {
      totalSize += cachedImage.size;
    }
    return totalSize;
  }

  /**
   * Update cache statistics
   */
  private updateCacheStats(): void {
    const stats: CacheStats = {
      totalImages: this.cache.size,
      totalSize: this.getCurrentCacheSize(),
      maxSize: this.cacheConfig.maxSize,
      hitRate: this.stats.totalRequests > 0 ? 
        (this.stats.hitCount / this.stats.totalRequests) * 100 : 0,
      missCount: this.stats.missCount,
      hitCount: this.stats.hitCount
    };

    this.ngZone.run(() => {
      this.cacheStats$.next(stats);
    });
  }

  /**
   * Persist cache to localStorage
   */
  private persistCache(): void {
    try {
      const cacheData: Record<string, CachedImage> = {};
      for (const [url, cachedImage] of this.cache.entries()) {
        cacheData[url] = cachedImage;
      }
      
      localStorage.setItem('image-cache', JSON.stringify(cacheData));
      localStorage.setItem('image-cache-config', JSON.stringify(this.cacheConfig));
    } catch (error) {
      console.error('Failed to persist image cache:', error);
    }
  }

  /**
   * Wait for cache initialization
   */
  private waitForInitialization(): Observable<void> {
    return new Observable(observer => {
      const checkInit = () => {
        if (this.isInitialized) {
          observer.next();
          observer.complete();
        } else {
          setTimeout(checkInit, 100);
        }
      };
      checkInit();
    });
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const expiredUrls: string[] = [];

    for (const [url, cachedImage] of this.cache.entries()) {
      if (now - cachedImage.timestamp > this.cacheConfig.ttl) {
        expiredUrls.push(url);
      }
    }

    expiredUrls.forEach(url => this.cache.delete(url));
    
    if (expiredUrls.length > 0) {
      this.updateCacheStats();
      this.persistCache();
    }
  }

  /**
   * Clear the entire cache
   */
  clearCache(): void {
    this.cache.clear();
    this.stats = { hitCount: 0, missCount: 0, totalRequests: 0 };
    this.updateCacheStats();
    this.persistCache();
  }

  /**
   * Remove a specific image from cache
   */
  removeFromCache(url: string): boolean {
    const removed = this.cache.delete(url);
    if (removed) {
      this.updateCacheStats();
      this.persistCache();
    }
    return removed;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return {
      totalImages: this.cache.size,
      totalSize: this.getCurrentCacheSize(),
      maxSize: this.cacheConfig.maxSize,
      hitRate: this.stats.totalRequests > 0 ? 
        (this.stats.hitCount / this.stats.totalRequests) * 100 : 0,
      missCount: this.stats.missCount,
      hitCount: this.stats.hitCount
    };
  }

  /**
   * Get cache statistics as observable
   */
  getCacheStats$(): Observable<CacheStats> {
    return this.cacheStats$.asObservable();
  }

  /**
   * Update cache configuration
   */
  updateCacheConfig(config: Partial<CacheConfig>): void {
    this.cacheConfig = { ...this.cacheConfig, ...config };
    
    // If max size or count was reduced, clean up cache
    if (config.maxSize !== undefined || config.maxImages !== undefined) {
      this.ensureCacheSpace(0);
    }
    
    this.updateCacheStats();
    this.persistCache();
  }

  /**
   * Get current cache configuration
   */
  getCacheConfig(): CacheConfig {
    return { ...this.cacheConfig };
  }

  /**
   * Check if an image is cached
   */
  isCached(url: string): boolean {
    const cached = this.cache.get(url);
    if (!cached) return false;
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.cacheConfig.ttl) {
      this.cache.delete(url);
      return false;
    }
    
    return true;
  }

  /**
   * Preload images into cache
   */
  preloadImages(urls: string[]): Observable<{ url: string; success: boolean }[]> {
    return from(urls).pipe(
      mergeMap(url => 
        this.getImage(url).pipe(
          map(() => ({ url, success: true })),
          catchError(() => of({ url, success: false }))
        )
      ),
      // Collect all results into an array
      toArray()
    );
  }

  /**
   * Get cache size in human readable format
   */
  getCacheSizeFormatted(): string {
    const bytes = this.getCurrentCacheSize();
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get max cache size in human readable format
   */
  getMaxCacheSizeFormatted(): string {
    const bytes = this.cacheConfig.maxSize;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}
