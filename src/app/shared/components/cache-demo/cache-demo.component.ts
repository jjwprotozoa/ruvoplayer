import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subject, takeUntil } from 'rxjs';
import { CachedImageDirective } from '../../directives/cached-image.directive';
import { CacheStats, ImageCacheService } from '../../services/image-cache.service';

@Component({
  selector: 'app-cache-demo',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    CachedImageDirective
  ],
  template: `
    <div class="cache-demo">
      <div class="header">
        <h2>Image Cache Demo</h2>
        <p>This demo shows how images are cached and loaded instantly on subsequent visits.</p>
      </div>

      <!-- Cache Statistics -->
      <mat-card class="stats-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>analytics</mat-icon>
            Live Cache Statistics
          </mat-card-title>
        </mat-card-header>
        <mat-card-content *ngIf="cacheStats">
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-label">Cache Hits</div>
              <div class="stat-value">{{ cacheStats.hitCount }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Cache Misses</div>
              <div class="stat-value">{{ cacheStats.missCount }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Hit Rate</div>
              <div class="stat-value">{{ cacheStats.hitRate | number:'1.1-1' }}%</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Total Images</div>
              <div class="stat-value">{{ cacheStats.totalImages }}</div>
            </div>
          </div>
          
          <div class="cache-usage">
            <div class="usage-label">Cache Usage: {{ formatBytes(cacheStats.totalSize) }} / {{ formatBytes(cacheStats.maxSize) }}</div>
            <mat-progress-bar 
              [value]="getCacheUsagePercentage()" 
              [color]="getCacheUsageColor()"
              class="usage-bar">
            </mat-progress-bar>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Demo Images -->
      <mat-card class="demo-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>image</mat-icon>
            Demo Images
          </mat-card-title>
          <mat-card-subtitle>
            Click the buttons below to test image caching. Notice how images load instantly on subsequent clicks!
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="demo-controls">
            <button mat-raised-button color="primary" (click)="loadDemoImages()">
              <mat-icon>refresh</mat-icon>
              Load Demo Images
            </button>
            <button mat-raised-button color="accent" (click)="clearCache()">
              <mat-icon>clear</mat-icon>
              Clear Cache
            </button>
            <button mat-raised-button color="warn" (click)="preloadImages()">
              <mat-icon>download</mat-icon>
              Preload All Images
            </button>
          </div>

          <div class="image-grid">
            <div class="image-item" *ngFor="let image of demoImages; trackBy: trackByUrl">
              <div class="image-container">
                <img 
                  [appCachedImage]="image.url"
                  [fallbackSrc]="'./assets/images/default-poster.png'"
                  [alt]="image.name"
                  class="demo-image"
                />
                <div class="image-overlay">
                  <div class="image-name">{{ image.name }}</div>
                  <div class="cache-status" [class.cached]="isImageCached(image.url)">
                    {{ isImageCached(image.url) ? 'Cached' : 'Not Cached' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Instructions -->
      <mat-card class="instructions-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>help</mat-icon>
            How It Works
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="instructions">
            <div class="instruction-step">
              <div class="step-number">1</div>
              <div class="step-content">
                <strong>First Load:</strong> When you first click "Load Demo Images", images are downloaded from the server and cached locally.
              </div>
            </div>
            <div class="instruction-step">
              <div class="step-number">2</div>
              <div class="step-content">
                <strong>Subsequent Loads:</strong> On subsequent clicks, images load instantly from the local cache without any network requests.
              </div>
            </div>
            <div class="instruction-step">
              <div class="step-number">3</div>
              <div class="step-content">
                <strong>Cache Management:</strong> The cache automatically manages storage limits and removes least recently used images when needed.
              </div>
            </div>
            <div class="instruction-step">
              <div class="step-number">4</div>
              <div class="step-content">
                <strong>Performance:</strong> Notice the difference in loading speed between cached and non-cached images!
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .cache-demo {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .header {
      text-align: center;
      margin-bottom: 20px;

      h2 {
        color: #1976d2;
        margin-bottom: 8px;
      }

      p {
        color: rgba(0, 0, 0, 0.7);
        font-size: 1.1rem;
      }
    }

    .stats-card, .demo-card, .instructions-card {
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }

    .stat-item {
      text-align: center;
      padding: 16px;
      background: rgba(25, 118, 210, 0.05);
      border-radius: 8px;
      border: 1px solid rgba(25, 118, 210, 0.2);

      .stat-label {
        font-size: 14px;
        color: rgba(0, 0, 0, 0.6);
        margin-bottom: 8px;
      }

      .stat-value {
        font-size: 24px;
        font-weight: 600;
        color: #1976d2;
      }
    }

    .cache-usage {
      .usage-label {
        font-weight: 500;
        margin-bottom: 8px;
        color: rgba(0, 0, 0, 0.8);
      }

      .usage-bar {
        height: 8px;
        border-radius: 4px;
      }
    }

    .demo-controls {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;

      button {
        mat-icon {
          margin-right: 8px;
        }
      }
    }

    .image-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px;
    }

    .image-item {
      .image-container {
        position: relative;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s ease;

        &:hover {
          transform: translateY(-4px);
        }
      }

      .demo-image {
        width: 100%;
        height: 200px;
        object-fit: cover;
        display: block;
      }

      .image-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
        color: white;
        padding: 16px 12px 12px;
        text-align: center;

        .image-name {
          font-weight: 600;
          margin-bottom: 4px;
        }

        .cache-status {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.2);
          display: inline-block;

          &.cached {
            background: rgba(76, 175, 80, 0.8);
            color: white;
          }
        }
      }
    }

    .instructions {
      .instruction-step {
        display: flex;
        align-items: flex-start;
        margin-bottom: 20px;
        gap: 16px;

        .step-number {
          width: 32px;
          height: 32px;
          background: #1976d2;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          flex-shrink: 0;
        }

        .step-content {
          line-height: 1.6;
          color: rgba(0, 0, 0, 0.8);

          strong {
            color: #1976d2;
          }
        }
      }
    }

    @media (max-width: 768px) {
      .cache-demo {
        padding: 16px;
        gap: 16px;
      }

      .demo-controls {
        flex-direction: column;
      }

      .image-grid {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 16px;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
    }
  `]
})
export class CacheDemoComponent implements OnInit, OnDestroy {
  cacheStats: CacheStats | null = null;
  demoImages: Array<{ url: string; name: string }> = [
    {
      url: 'https://picsum.photos/400/600?random=1',
      name: 'Random Image 1'
    },
    {
      url: 'https://picsum.photos/400/600?random=2',
      name: 'Random Image 2'
    },
    {
      url: 'https://picsum.photos/400/600?random=3',
      name: 'Random Image 3'
    },
    {
      url: 'https://picsum.photos/400/600?random=4',
      name: 'Random Image 4'
    },
    {
      url: 'https://picsum.photos/400/600?random=5',
      name: 'Random Image 5'
    },
    {
      url: 'https://picsum.photos/400/600?random=6',
      name: 'Random Image 6'
    }
  ];

  private destroy$ = new Subject<void>();

  constructor(private imageCacheService: ImageCacheService) {}

  ngOnInit(): void {
    // Subscribe to cache stats updates
    this.imageCacheService.getCacheStats$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => {
        this.cacheStats = stats;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDemoImages(): void {
    // This will trigger the images to load and cache
    console.log('Loading demo images...');
  }

  clearCache(): void {
    if (confirm('Are you sure you want to clear the entire image cache?')) {
      this.imageCacheService.clearCache();
    }
  }

  preloadImages(): void {
    const urls = this.demoImages.map(img => img.url);
    this.imageCacheService.preloadImages(urls).subscribe(results => {
      const successCount = results.filter(r => r.success).length;
      console.log(`Preloaded ${successCount} out of ${urls.length} images`);
    });
  }

  isImageCached(url: string): boolean {
    return this.imageCacheService.isCached(url);
  }

  getCacheUsagePercentage(): number {
    if (!this.cacheStats) return 0;
    return (this.cacheStats.totalSize / this.cacheStats.maxSize) * 100;
  }

  getCacheUsageColor(): string {
    const percentage = this.getCacheUsagePercentage();
    if (percentage >= 90) return 'warn';
    if (percentage >= 70) return 'accent';
    return 'primary';
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  trackByUrl(index: number, item: { url: string; name: string }): string {
    return item.url;
  }
}
