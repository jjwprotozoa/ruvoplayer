# Image Caching System

This directory contains a comprehensive image caching solution for the Ruvo Player app that improves performance and reduces bandwidth usage.

## Features

-   **Automatic Image Caching**: Images are automatically cached after first load
-   **Configurable Cache Limits**: Set maximum cache size and image count
-   **LRU Eviction**: Least recently used images are automatically removed when limits are reached
-   **Image Compression**: Optional JPEG compression to save storage space
-   **Lazy Loading**: Images load only when they come into view
-   **Fallback Support**: Automatic fallback to default images on load failure
-   **Persistent Storage**: Cache survives app restarts using localStorage
-   **Statistics Tracking**: Monitor cache hit rates and usage

## Components

### CacheManagerComponent

A comprehensive UI component for managing image cache settings and viewing statistics.

**Usage:**

```html
<app-cache-manager></app-cache-manager>
```

### CachedImageDirective

A directive that automatically applies image caching to any `<img>` element.

**Usage:**

```html
<!-- Basic usage -->
<img [appCachedImage]="imageUrl" />

<!-- With fallback and lazy loading -->
<img
    [appCachedImage]="imageUrl"
    [fallbackSrc]="'./assets/images/default-poster.png'"
    [lazyLoad]="true"
    [preload]="false"
    [alt]="'Image description'"
/>
```

**Inputs:**

-   `appCachedImage`: The URL of the image to cache
-   `fallbackSrc`: Fallback image URL if the main image fails to load
-   `lazyLoad`: Enable/disable lazy loading (default: true)
-   `preload`: Preload image into cache without displaying (default: false)

### CachedImagePipe

A pipe for getting cached images in templates.

**Usage:**

```html
<img [src]="imageUrl | cachedImage | async" />
```

## Services

### ImageCacheService

The core service that manages image caching operations.

**Basic Usage:**

```typescript
import { ImageCacheService } from '../shared/services/image-cache.service';

constructor(private imageCacheService: ImageCacheService) {}

// Get a cached image
this.imageCacheService.getImage(imageUrl).subscribe(
  dataUrl => {
    // Use the cached image data URL
  },
  error => {
    // Handle error
  }
);

// Check if image is cached
const isCached = this.imageCacheService.isCached(imageUrl);

// Clear the entire cache
this.imageCacheService.clearCache();

// Get cache statistics
const stats = this.imageCacheService.getCacheStats();
```

**Configuration:**

```typescript
// Update cache configuration
this.imageCacheService.updateCacheConfig({
    maxSize: 200 * 1024 * 1024, // 200MB
    maxImages: 2000,
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    enableCompression: true,
    compressionQuality: 0.8,
});
```

## Cache Configuration

The image cache can be configured with the following options:

-   **maxSize**: Maximum cache size in bytes (default: 100MB)
-   **maxImages**: Maximum number of images to cache (default: 1000)
-   **ttl**: Time to live for cached images in milliseconds (default: 24 hours)
-   **enableCompression**: Enable JPEG compression (default: true)
-   **compressionQuality**: Compression quality from 0.1 to 1.0 (default: 0.8)

## Integration Examples

### 1. Replace existing image tags

```html
<!-- Before -->
<img [src]="item.poster_url" />

<!-- After -->
<img [appCachedImage]="item.poster_url" />
```

### 2. Add to component imports

```typescript
import { CachedImageDirective } from '../shared/directives/cached-image.directive';

@Component({
  // ...
  standalone: true,
  imports: [
    // ... other imports
    CachedImageDirective
  ]
})
```

### 3. Preload important images

```typescript
// Preload images for better user experience
this.imageCacheService
    .preloadImages([
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
    ])
    .subscribe((results) => {
        results.forEach((result) => {
            if (result.success) {
                console.log(`Preloaded: ${result.url}`);
            }
        });
    });
```

## Performance Benefits

-   **Faster Loading**: Cached images load instantly
-   **Reduced Bandwidth**: Images are only downloaded once
-   **Better UX**: No more loading spinners for previously viewed images
-   **Offline Support**: Cached images work even without internet connection
-   **Memory Efficient**: Automatic cleanup prevents memory bloat

## Browser Compatibility

-   **Modern Browsers**: Full support with Intersection Observer API
-   **Older Browsers**: Graceful fallback to immediate loading
-   **Mobile**: Optimized for touch devices with lazy loading

## Storage Considerations

-   **localStorage**: Cache data is stored in browser's localStorage
-   **Size Limits**: Be aware of browser localStorage size limits (usually 5-10MB)
-   **Automatic Cleanup**: Cache automatically manages storage within configured limits
-   **Persistence**: Cache survives browser restarts and app reloads

## Troubleshooting

### Images not caching

-   Check if the image URL is accessible
-   Verify CORS settings for external images
-   Check browser console for errors

### Cache not persisting

-   Ensure localStorage is enabled in the browser
-   Check if localStorage quota is exceeded
-   Verify the cache configuration is valid

### Performance issues

-   Reduce cache size limits
-   Enable image compression
-   Adjust TTL settings
-   Monitor cache hit rates
