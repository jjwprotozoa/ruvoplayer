import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { CacheConfig, CacheStats, ImageCacheService } from '../../services/image-cache.service';

@Component({
  selector: 'app-cache-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatSliderModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatDialogModule,
    MatSelectModule
  ],
  templateUrl: './cache-manager.component.html',
  styleUrls: ['./cache-manager.component.scss']
})
export class CacheManagerComponent implements OnInit, OnDestroy {
  cacheStats: CacheStats | null = null;
  cacheConfig: CacheConfig | null = null;
  isEditing = false;
  tempConfig: CacheConfig | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private imageCacheService: ImageCacheService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadCacheData();
    
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

  loadCacheData(): void {
    this.cacheStats = this.imageCacheService.getCacheStats();
    this.cacheConfig = this.imageCacheService.getCacheConfig();
  }

  startEditing(): void {
    this.tempConfig = { ...this.cacheConfig! };
    this.isEditing = true;
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.tempConfig = null;
  }

  saveConfig(): void {
    if (this.tempConfig) {
      this.imageCacheService.updateCacheConfig(this.tempConfig);
      this.cacheConfig = { ...this.tempConfig };
      this.isEditing = false;
      this.tempConfig = null;
    }
  }

  clearCache(): void {
    if (confirm('Are you sure you want to clear the entire image cache? This action cannot be undone.')) {
      this.imageCacheService.clearCache();
      this.loadCacheData();
    }
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

  getMaxSizeOptions(): { value: number; label: string }[] {
    return [
      { value: 50 * 1024 * 1024, label: '50 MB' },
      { value: 100 * 1024 * 1024, label: '100 MB' },
      { value: 200 * 1024 * 1024, label: '200 MB' },
      { value: 500 * 1024 * 1024, label: '500 MB' },
      { value: 1024 * 1024 * 1024, label: '1 GB' }
    ];
  }

  getMaxImagesOptions(): { value: number; label: string }[] {
    return [
      { value: 100, label: '100' },
      { value: 500, label: '500' },
      { value: 1000, label: '1000' },
      { value: 2000, label: '2000' },
      { value: 5000, label: '5000' }
    ];
  }

  getTtlOptions(): { value: number; label: string }[] {
    return [
      { value: 1 * 60 * 60 * 1000, label: '1 hour' },
      { value: 6 * 60 * 60 * 1000, label: '6 hours' },
      { value: 12 * 60 * 60 * 1000, label: '12 hours' },
      { value: 24 * 60 * 60 * 1000, label: '24 hours' },
      { value: 7 * 24 * 60 * 60 * 1000, label: '7 days' }
    ];
  }

  getCompressionQualityLabel(): string {
    if (!this.tempConfig) return '';
    const quality = this.tempConfig.compressionQuality;
    if (quality >= 0.9) return 'High Quality';
    if (quality >= 0.7) return 'Good Quality';
    if (quality >= 0.5) return 'Medium Quality';
    return 'Low Quality';
  }
}
