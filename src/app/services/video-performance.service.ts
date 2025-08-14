import { Injectable } from '@angular/core';

export interface VideoPerformanceConfig {
    // HLS Configuration
    enableWorker: boolean;
    lowLatencyMode: boolean;
    backBufferLength: number;
    maxBufferLength: number;
    maxBufferSize: number;
    maxBufferHole: number;
    maxSeekHole: number;
    maxStarvationDelay: number;
    maxLoadingDelay: number;
    fragLoadingTimeOut: number;
    manifestLoadingTimeOut: number;
    levelLoadingTimeOut: number;
    startLevel: number;
    abrEwmaDefaultEstimate: number;
    abrBandWidthFactor: number;
    abrBandWidthUpFactor: number;
    startFragPrefetch: boolean;
    testBandwidth: boolean;
    progressive: boolean;
    debug: boolean;
    
    // Advanced Buffering Strategy
    aggressiveBuffering: boolean;
    bufferAheadSeconds: number;
    seekBufferSize: number;
    prefetchThreshold: number;
    adaptiveBufferManagement: boolean;
    bufferRebuildThreshold: number;
    
    // Adaptive Quality Streaming
    adaptiveQualityEnabled: boolean;
    startWithLowQuality: boolean;
    qualitySwitchThreshold: number;
    bandwidthTestInterval: number;
    qualityUpgradeDelay: number;
    qualityDowngradeThreshold: number;
    bufferHealthThreshold: number;
}

@Injectable({
    providedIn: 'root',
})
export class VideoPerformanceService {
    private readonly defaultVodConfig: VideoPerformanceConfig = {
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 120, // 2 minutes of buffer behind current position
        maxBufferLength: 300, // 5 minutes of total buffer
        maxBufferSize: 120 * 1000 * 1000, // 120MB buffer size
        maxBufferHole: 0.5,
        maxSeekHole: 2,
        maxStarvationDelay: 4,
        maxLoadingDelay: 4,
        fragLoadingTimeOut: 20000, // 20 seconds for VOD
        manifestLoadingTimeOut: 20000,
        levelLoadingTimeOut: 20000,
        startLevel: -1, // Auto-select best quality
        abrEwmaDefaultEstimate: 500000, // 500kbps default
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.7,
        startFragPrefetch: true,
        testBandwidth: true,
        progressive: false,
        debug: false,
        
        // Advanced buffering for VOD
        aggressiveBuffering: true,
        bufferAheadSeconds: 180, // Buffer 3 minutes ahead
        seekBufferSize: 60, // 1 minute buffer for seeking
        prefetchThreshold: 0.8, // Start prefetching when 80% through current buffer
        adaptiveBufferManagement: true,
        bufferRebuildThreshold: 0.3, // Rebuild buffer when 30% remains
        
        // Adaptive Quality Streaming
        adaptiveQualityEnabled: false,
        startWithLowQuality: true,
        qualitySwitchThreshold: 0.7, // Switch to high quality when 70% of buffer is healthy
        bandwidthTestInterval: 10000, // Test bandwidth every 10 seconds
        qualityUpgradeDelay: 5000, // Delay before upgrading quality
        qualityDowngradeThreshold: 0.3, // Downgrade quality if buffer health drops below 30%
        bufferHealthThreshold: 0.8, // Buffer is considered healthy if 80% of it is used
    };

    private readonly defaultLiveConfig: VideoPerformanceConfig = {
        enableWorker: true,
        lowLatencyMode: true, // Re-enable for better live streaming performance
        backBufferLength: 30, // Reduced from 60 to 30 seconds for faster response
        maxBufferLength: 60, // Reduced from 120 to 60 seconds for faster loading
        maxBufferSize: 30 * 1000 * 1000, // Reduced from 60MB to 30MB for live
        maxBufferHole: 0.5,
        maxSeekHole: 2,
        maxStarvationDelay: 2, // Reduced from 4 to 2 for faster recovery
        maxLoadingDelay: 2, // Reduced from 4 to 2 for faster loading
        fragLoadingTimeOut: 10000, // Reduced from 20 to 10 seconds for faster live loading
        manifestLoadingTimeOut: 10000, // Reduced from 20 to 10 seconds for faster live loading
        levelLoadingTimeOut: 10000, // Reduced from 20 to 10 seconds for faster live loading
        startLevel: -1,
        abrEwmaDefaultEstimate: 500000,
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.7,
        startFragPrefetch: true, // Enable for better live loading
        testBandwidth: true,
        progressive: false,
        debug: false,
        
        // Optimized buffering for live (faster response)
        aggressiveBuffering: false,
        bufferAheadSeconds: 30, // Reduced from 60 to 30 seconds for faster response
        seekBufferSize: 15, // Reduced from 30 to 15 seconds for faster seeking
        prefetchThreshold: 0.6, // Reduced from 0.7 to 0.6 for more responsive buffering
        adaptiveBufferManagement: true, // Enable for live streams
        bufferRebuildThreshold: 0.3, // Reduced from 0.4 to 0.3 for more responsive buffering
        
        // Adaptive Quality Streaming
        adaptiveQualityEnabled: false,
        startWithLowQuality: true,
        qualitySwitchThreshold: 0.7, // Switch to high quality when 70% of buffer is healthy
        bandwidthTestInterval: 10000, // Test bandwidth every 10 seconds
        qualityUpgradeDelay: 5000, // Delay before upgrading quality
        qualityDowngradeThreshold: 0.3, // Downgrade quality if buffer health drops below 30%
        bufferHealthThreshold: 0.8, // Buffer is considered healthy if 80% of it is used
    };

    /**
     * Get optimized HLS configuration based on content type
     */
    getHlsConfig(isVod: boolean): VideoPerformanceConfig {
        const baseConfig = isVod ? this.defaultVodConfig : this.defaultLiveConfig;
        
        // Apply additional optimizations based on network conditions
        if (isVod && this.shouldUseAggressiveBuffering()) {
            baseConfig.bufferAheadSeconds = Math.min(baseConfig.bufferAheadSeconds * 1.5, 300); // Up to 5 minutes
            baseConfig.maxBufferSize = Math.min(baseConfig.maxBufferSize * 1.5, 200 * 1000 * 1000); // Up to 200MB
        }
        
        return { ...baseConfig };
    }

    /**
     * Get seamless seeking configuration
     */
    getSeekingConfig(isVod: boolean): any {
        if (!isVod) return {};
        
        return {
            // Pre-buffer around seek position
            seekBufferSize: this.defaultVodConfig.seekBufferSize,
            // Start buffering immediately after seek
            immediateBufferAfterSeek: true,
            // Buffer multiple quality levels for smooth seeking
            bufferMultipleLevels: true,
            // Preload fragments around seek position
            preloadFragments: 3,
        };
    }

    /**
     * Check if we should use aggressive buffering based on network conditions
     */
    private shouldUseAggressiveBuffering(): boolean {
        // Check if we have good network conditions
        if ('connection' in navigator) {
            const connection = (navigator as any).connection;
            if (connection.effectiveType === '4g' || connection.effectiveType === '5g') {
                return true;
            }
            if (connection.downlink > 10) { // More than 10 Mbps
                return true;
            }
        }
        
        // Check if user has good bandwidth (we could implement bandwidth testing)
        return this.getEstimatedBandwidth() > 5000000; // 5 Mbps
    }

    /**
     * Get estimated bandwidth (simplified implementation)
     */
    private getEstimatedBandwidth(): number {
        // This is a simplified implementation
        // In a real app, you'd want to implement proper bandwidth testing
        return 10000000; // Assume 10 Mbps for now
    }

    /**
     * Get adaptive buffer management settings
     */
    getAdaptiveBufferSettings(isVod: boolean): any {
        if (!isVod) return {};
        
        return {
            // Dynamically adjust buffer size based on playback speed
            dynamicBufferAdjustment: true,
            // Increase buffer size during fast-forward
            fastForwardBufferMultiplier: 2.0,
            // Decrease buffer size during normal playback to save memory
            normalPlaybackBufferMultiplier: 0.8,
            // Buffer size for different seek distances
            seekDistanceBufferMap: {
                small: 30,    // 30 seconds for small seeks
                medium: 60,   // 1 minute for medium seeks
                large: 120,   // 2 minutes for large seeks
            }
        };
    }

    /**
     * Get prefetching strategy for VOD
     */
    getPrefetchStrategy(isVod: boolean): any {
        if (!isVod) return {};
        
        return {
            // Prefetch next episode/chapter if available
            prefetchNextContent: true,
            // Prefetch based on user behavior patterns
            behaviorBasedPrefetch: true,
            // Prefetch during idle time
            idleTimePrefetch: true,
            // Prefetch during buffering
            bufferTimePrefetch: true,
        };
    }

    /**
     * Get optimized video element attributes for VOD
     */
    getVodVideoAttributes(): Partial<HTMLVideoElement> {
        return {
            preload: 'metadata' as any, // Preload metadata for VOD
            playsInline: true,
            muted: false,
            autoplay: false, // Don't autoplay VOD immediately
        };
    }

    /**
     * Get optimized video element attributes for live streams
     */
    getLiveVideoAttributes(): Partial<HTMLVideoElement> {
        return {
            preload: 'auto' as any, // Preload everything for live
            playsInline: true,
            muted: false,
            autoplay: true, // Autoplay live streams
        };
    }

    /**
     * Detect if content is VOD based on URL or extension
     */
    isVodContent(url: string): boolean {
        const extension = this.getExtensionFromUrl(url);
        const lowerUrl = url.toLowerCase();
        
        // VOD typically has longer extensions or specific patterns
        const isVodByExtension = extension === 'mp4' || extension === 'mkv' || extension === 'avi' || 
                                 extension === 'mov' || extension === 'wmv' || extension === 'flv';
        
        const isVodByUrl = lowerUrl.includes('/movie/') || 
                           lowerUrl.includes('/vod/') || 
                           lowerUrl.includes('/film/') ||
                           lowerUrl.includes('/series/') ||
                           lowerUrl.includes('/episode/') ||
                           lowerUrl.includes('stream_id') ||
                           lowerUrl.includes('movie_data');
        
        // Check if URL contains timestamp or session parameters (indicates live)
        const isLiveByUrl = lowerUrl.includes('live') || 
                           lowerUrl.includes('stream') ||
                           lowerUrl.includes('channel') ||
                           lowerUrl.includes('m3u8') ||
                           lowerUrl.includes('ts');
        
        // If it's clearly VOD by extension or URL pattern, return true
        if (isVodByExtension || isVodByUrl) {
            return true;
        }
        
        // If it's clearly live by URL pattern, return false
        if (isLiveByUrl) {
            return false;
        }
        
        // Default to VOD for better buffering
        console.log('Content type detection for URL:', url, 'Defaulting to VOD');
        return true;
    }

    /**
     * Get file extension from URL
     */
    private getExtensionFromUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const extension = pathname.split('.').pop()?.toLowerCase();
            return extension || '';
        } catch {
            // Fallback for relative URLs
            const extension = url.split('.').pop()?.toLowerCase();
            return extension || '';
        }
    }

    /**
     * Get adaptive quality streaming configuration
     * @param isVod Whether this is VOD content
     * @returns Adaptive quality configuration
     */
    getAdaptiveQualityConfig(isVod: boolean): any {
        const baseConfig = isVod ? this.defaultVodConfig : this.defaultLiveConfig;
        
        return {
            enabled: baseConfig.adaptiveQualityEnabled,
            startWithLowQuality: baseConfig.startWithLowQuality,
            qualitySwitchThreshold: baseConfig.qualitySwitchThreshold,
            bandwidthTestInterval: baseConfig.bandwidthTestInterval,
            qualityUpgradeDelay: baseConfig.qualityUpgradeDelay,
            qualityDowngradeThreshold: baseConfig.qualityDowngradeThreshold,
            bufferHealthThreshold: baseConfig.bufferHealthThreshold,
            
            // VOD-specific adaptive quality settings
            vod: isVod ? {
                aggressiveQualityUpgrade: true,
                qualityUpgradeInterval: 15000, // 15 seconds for VOD
                maxQualityLevels: 5, // Allow more quality levels for VOD
                seekQualityOptimization: true, // Optimize quality after seeking
            } : {},
            
            // Live-specific adaptive quality settings
            live: !isVod ? {
                conservativeQualityUpgrade: true,
                qualityUpgradeInterval: 30000, // 30 seconds for live
                maxQualityLevels: 3, // Limit quality levels for live
                realTimeQualityAdjustment: true, // Real-time quality adjustment
            } : {}
        };
    }

    /**
     * Get bandwidth-aware HLS configuration
     * @param isVod Whether this is VOD content
     * @param estimatedBandwidth Estimated bandwidth in bps
     * @returns Optimized HLS configuration
     */
    getBandwidthOptimizedHlsConfig(isVod: boolean, estimatedBandwidth?: number): VideoPerformanceConfig {
        const baseConfig = this.getHlsConfig(isVod);
        
        // If we have bandwidth information, optimize the configuration
        if (estimatedBandwidth) {
            // Adjust buffer sizes based on bandwidth
            if (estimatedBandwidth > 10000000) { // 10+ Mbps
                baseConfig.maxBufferSize = Math.min(baseConfig.maxBufferSize * 1.5, 200 * 1000 * 1000);
                baseConfig.maxBufferLength = Math.min(baseConfig.maxBufferLength * 1.5, 600);
            } else if (estimatedBandwidth < 5000000) { // < 5 Mbps
                baseConfig.maxBufferSize = Math.max(baseConfig.maxBufferSize * 0.7, 30 * 1000 * 1000);
                baseConfig.maxBufferLength = Math.max(baseConfig.maxBufferLength * 0.7, 60);
            }
            
            // Adjust ABR settings based on bandwidth
            baseConfig.abrEwmaDefaultEstimate = Math.min(estimatedBandwidth * 0.8, 5000000);
            baseConfig.abrBandWidthFactor = estimatedBandwidth > 10000000 ? 0.98 : 0.95;
        }
        
        return baseConfig;
    }

    /**
     * Get network-aware quality strategy
     * @param connectionType Network connection type
     * @param effectiveType Effective connection type
     * @returns Quality strategy configuration
     */
    getNetworkAwareQualityStrategy(connectionType?: string, effectiveType?: string): any {
        const strategy = {
            startQuality: 'auto',
            maxQuality: 'auto',
            qualityUpgradeStrategy: 'conservative',
            bufferStrategy: 'balanced'
        };
        
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
            strategy.startQuality = 'lowest';
            strategy.maxQuality = 'low';
            strategy.qualityUpgradeStrategy = 'very-conservative';
            strategy.bufferStrategy = 'minimal';
        } else if (effectiveType === '3g') {
            strategy.startQuality = 'low';
            strategy.maxQuality = 'medium';
            strategy.qualityUpgradeStrategy = 'conservative';
            strategy.bufferStrategy = 'conservative';
        } else if (effectiveType === '4g') {
            strategy.startQuality = 'medium';
            strategy.maxQuality = 'high';
            strategy.qualityUpgradeStrategy = 'balanced';
            strategy.bufferStrategy = 'balanced';
        } else if (effectiveType === '5g') {
            strategy.startQuality = 'high';
            strategy.maxQuality = 'highest';
            strategy.qualityUpgradeStrategy = 'aggressive';
            strategy.bufferStrategy = 'aggressive';
        }
        
        return strategy;
    }
}
