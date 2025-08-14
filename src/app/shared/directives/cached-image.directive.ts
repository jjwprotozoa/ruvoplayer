import { Directive, ElementRef, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ImageCacheService } from '../services/image-cache.service';

@Directive({
  selector: 'img[appCachedImage]',
  standalone: true
})
export class CachedImageDirective implements OnInit, OnDestroy {
  @Input() appCachedImage: string = '';
  @Input() fallbackSrc: string = '';
  @Input() lazyLoad: boolean = true;
  @Input() preload: boolean = false;

  private destroy$ = new Subject<void>();
  private imgElement: HTMLImageElement;
  private observer: IntersectionObserver | null = null;

  constructor(
    private el: ElementRef<HTMLImageElement>,
    private imageCacheService: ImageCacheService,
    private ngZone: NgZone
  ) {
    this.imgElement = this.el.nativeElement;
  }

  ngOnInit(): void {
    if (!this.appCachedImage) {
      console.warn('CachedImageDirective: No image URL provided');
      return;
    }

    // Set up intersection observer for lazy loading
    if (this.lazyLoad && 'IntersectionObserver' in window) {
      this.setupIntersectionObserver();
    } else {
      // Fallback: load immediately
      this.loadCachedImage();
    }

    // Preload if requested
    if (this.preload) {
      this.preloadImage();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private setupIntersectionObserver(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadCachedImage();
            this.observer?.unobserve(this.imgElement);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before the image comes into view
        threshold: 0.1
      }
    );

    this.observer.observe(this.imgElement);
  }

  private loadCachedImage(): void {
    // Show loading state
    this.imgElement.style.opacity = '0.5';
    
    // Add loading class for CSS styling
    this.imgElement.classList.add('loading');

    this.imageCacheService.getImage(this.appCachedImage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (dataUrl) => {
          this.ngZone.run(() => {
            this.imgElement.src = dataUrl;
            this.imgElement.style.opacity = '1';
            this.imgElement.classList.remove('loading');
            this.imgElement.classList.add('loaded');
          });
        },
        error: (error) => {
          console.error('Failed to load cached image:', error);
          this.ngZone.run(() => {
            this.handleImageError();
          });
        }
      });
  }

  private handleImageError(): void {
    this.imgElement.style.opacity = '1';
    this.imgElement.classList.remove('loading');
    
    // Try fallback image if provided
    if (this.fallbackSrc) {
      this.imgElement.src = this.fallbackSrc;
    } else {
      // Set default placeholder
      this.imgElement.src = './assets/images/default-poster.png';
    }
    
    this.imgElement.classList.add('error');
  }

  private preloadImage(): void {
    // Preload the image into cache without displaying it
    this.imageCacheService.getImage(this.appCachedImage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Image is now cached and ready for instant loading
        },
        error: (error) => {
          console.warn('Failed to preload image:', error);
        }
      });
  }

  // Public method to manually refresh the image
  refresh(): void {
    if (this.appCachedImage) {
      this.loadCachedImage();
    }
  }

  // Public method to check if image is cached
  isCached(): boolean {
    return this.imageCacheService.isCached(this.appCachedImage);
  }
}
