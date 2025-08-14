import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface StreamlinedVideoConfig {
    // Core performance settings
    enableAdaptiveBitrate: boolean;
    startWithLowQuality: boolean;
    aggressiveBuffering: boolean;
    
    // Buffer optimization
    maxBufferLength: number;        // Maximum buffer in seconds
    bufferAhead: number;            // Buffer ahead in seconds
    seekBufferSize: number;         // Buffer size for seeking
    
    // Quality switching
    qualityUpgradeDelay: number;    // Delay before upgrading quality
    qualityDowngradeThreshold: number; // Buffer threshold for downgrade
    
    // Live stream optimization
    liveStreamBuffer: number;       // Minimal buffer for live streams
    instantChannelSwitch: boolean;  // Enable instant channel switching
}

export interface VideoPerformanceMetrics {
    currentQuality: number;
    bufferHealth: number;
    networkLatency: number;
    isLiveStream: boolean;
    channelSwitchTime: number;
}

@Injectable({
    providedIn: 'root',
})
export class StreamlinedVideoService {
    private performanceMetrics$ = new BehaviorSubject<VideoPerformanceMetrics>({
        currentQuality: -1,
        bufferHealth: 1.0,
        networkLatency: 0,
        isLiveStream: true,
        channelSwitchTime: 0,
    });

    // Netflix-grade default configuration
    private readonly defaultConfig: StreamlinedVideoConfig = {
        enableAdaptiveBitrate: true,
        startWithLowQuality: true,
        aggressiveBuffering: true,
        maxBufferLength: 60,        // 1 minute buffer (Netflix-style)
        bufferAhead: 30,            // Buffer 30 seconds ahead
        seekBufferSize: 10,         // 10 seconds for seeking
        qualityUpgradeDelay: 3000,  // 3 seconds before upgrading
        qualityDowngradeThreshold: 0.2, // Downgrade at 20% buffer
        liveStreamBuffer: 15,       // 15 seconds for live (minimal)
        instantChannelSwitch: true, // Enable instant switching
    };

    private currentConfig = { ...this.defaultConfig };
    private isPWA = false;

    constructor() {
        this.detectEnvironment();
    }

    /**
     * Detect if running as PWA vs browser
     */
    private detectEnvironment(): void {
        // Check if running as installed PWA
        this.isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                     (window.navigator as any).standalone === true;
        
        console.log(`Running as ${this.isPWA ? 'PWA' : 'Browser'}`);
        
        // Optimize config based on environment
        if (this.isPWA) {
            // PWA can use more aggressive settings
            this.currentConfig.maxBufferLength = 90;  // 1.5 minutes
            this.currentConfig.bufferAhead = 45;      // 45 seconds ahead
        } else {
            // Browser: more conservative to avoid memory issues
            this.currentConfig.maxBufferLength = 45;  // 45 seconds
            this.currentConfig.bufferAhead = 20;      // 20 seconds ahead
        }
    }

    /**
     * Get optimized HLS configuration for Netflix-grade performance
     */
    getOptimizedHLSConfig(isLiveStream: boolean = true): any {
        const config = {
            // Core HLS settings
            enableWorker: true,
            lowLatencyMode: isLiveStream,
            backBufferLength: 0, // No back buffer for live streams
            
            // Buffer optimization
            maxBufferLength: isLiveStream ? this.currentConfig.liveStreamBuffer : this.currentConfig.maxBufferLength,
            maxBufferSize: 50 * 1000 * 1000, // 50MB max buffer size
            
            // Quality selection
            startLevel: isLiveStream ? 0 : -1, // Start at lowest for live, auto for VOD
            abrEwmaDefaultEstimate: 500000,    // 500kbps default estimate
            abrBandWidthFactor: 0.95,          // Conservative bandwidth usage
            abrBandWidthUpFactor: 0.7,         // Aggressive upgrade when possible
            
            // Fragment loading
            fragLoadingTimeOut: 10000,         // 10 second timeout
            manifestLoadingTimeOut: 8000,      // 8 second manifest timeout
            levelLoadingTimeOut: 10000,        // 10 second level timeout
            
            // Live stream optimizations
            liveSyncDurationCount: isLiveStream ? 3 : 5,    // Sync every 3 segments for live
            liveMaxLatencyDurationCount: isLiveStream ? 10 : 20, // Max latency for live
            liveDurationInfinity: !isLiveStream,            // Infinite duration for VOD
            
            // Performance optimizations
            progressive: true,                 // Progressive loading
            testBandwidth: true,              // Test bandwidth
            startFragPrefetch: true,          // Prefetch start fragment
        };

        return config;
    }

    /**
     * Get VideoJS configuration optimized for performance
     */
    getOptimizedVideoJSConfig(isLiveStream: boolean = true): any {
        return {
            // Core settings
            autoplay: true,
            muted: false,
            preload: 'auto',
            fluid: true,
            responsive: true,
            
            // Control optimization
            inactivityTimeout: 0,             // Keep controls visible
            userActions: {
                hotkeys: true,
                doubleClick: true,
            },
            
            // Performance settings
            liveui: isLiveStream,             // Enable live UI for live streams
            liveTracker: {
                trackingThreshold: 0,         // Track immediately for live
                liveTolerance: 15,            // 15 second live tolerance
            },
            
            // Buffer optimization
            html5: {
                hls: {
                    overrideNative: true,     // Use HLS.js instead of native
                    ...this.getOptimizedHLSConfig(isLiveStream),
                },
            },
        };
    }

    /**
     * Optimize for instant channel switching (live streams)
     */
    getInstantChannelSwitchConfig(): any {
        return {
            // Minimal buffer for instant switching
            maxBufferLength: 10,              // 10 seconds max
            maxBufferSize: 10 * 1000 * 1000, // 10MB max
            backBufferLength: 0,              // No back buffer
            
            // Aggressive quality selection
            startLevel: 0,                    // Always start at lowest
            abrEwmaDefaultEstimate: 300000,  // 300kbps estimate for fast start
            
            // Fast fragment loading
            fragLoadingTimeOut: 5000,         // 5 second timeout
            manifestLoadingTimeOut: 3000,     // 3 second manifest timeout
            
            // Live optimizations
            liveSyncDurationCount: 1,         // Sync every segment
            liveMaxLatencyDurationCount: 5,   // Minimal latency
        };
    }

    /**
     * Get current performance metrics
     */
    getPerformanceMetrics(): Observable<VideoPerformanceMetrics> {
        return this.performanceMetrics$.asObservable();
    }

    /**
     * Update performance metrics
     */
    updateMetrics(metrics: Partial<VideoPerformanceMetrics>): void {
        const current = this.performanceMetrics$.value;
        this.performanceMetrics$.next({ ...current, ...metrics });
    }

    /**
     * Optimize for specific network conditions
     */
    optimizeForNetwork(connectionType: string, effectiveType: string): void {
        let config = { ...this.currentConfig };

        switch (effectiveType) {
            case 'slow-2g':
            case '2g':
                config.maxBufferLength = 30;
                config.bufferAhead = 15;
                config.qualityUpgradeDelay = 10000;
                break;
            case '3g':
                config.maxBufferLength = 45;
                config.bufferAhead = 25;
                config.qualityUpgradeDelay = 5000;
                break;
            case '4g':
                config.maxBufferLength = 60;
                config.bufferAhead = 30;
                config.qualityUpgradeDelay = 3000;
                break;
            default:
                // Fast connection - use default Netflix-grade settings
                break;
        }

        this.currentConfig = config;
        console.log('Network-optimized config:', config);
    }

    /**
     * Get environment-specific optimizations
     */
    getEnvironmentOptimizations(): any {
        if (this.isPWA) {
            return {
                // PWA can use more aggressive settings
                enableServiceWorker: true,
                aggressiveCaching: true,
                backgroundSync: true,
            };
        } else {
            return {
                // Browser: conservative settings
                enableServiceWorker: false,
                aggressiveCaching: false,
                backgroundSync: false,
            };
        }
    }

    /**
     * Measure channel switch performance
     */
    measureChannelSwitch(): void {
        const startTime = performance.now();
        
        // This would be called when channel switching starts
        const switchTime = performance.now() - startTime;
        
        this.updateMetrics({
            channelSwitchTime: switchTime,
        });
        
        console.log(`Channel switch time: ${switchTime.toFixed(2)}ms`);
    }

    /**
     * Get current configuration
     */
    getConfig(): StreamlinedVideoConfig {
        return { ...this.currentConfig };
    }

    /**
     * Update configuration
     */
    updateConfig(updates: Partial<StreamlinedVideoConfig>): void {
        this.currentConfig = { ...this.currentConfig, ...updates };
        console.log('Updated video config:', this.currentConfig);
    }
}


