import { VideoPlayerConfig } from './unified-video-player.service';

/**
 * Default video player configuration
 */
export const DEFAULT_VIDEO_PLAYER_CONFIG: VideoPlayerConfig = {
    playerType: 'videojs',
    enableAdaptiveQuality: true,
    startWithLowQuality: true,
    enableControls: true,
    autoplay: true,
    muted: false,
};

/**
 * Adaptive quality configuration for different network conditions
 */
export const ADAPTIVE_QUALITY_CONFIG = {
    // Start with lower quality for faster initial loading
    startWithLowQuality: true,
    
    // Quality upgrade thresholds
    qualityUpgradeThreshold: 0.7, // Upgrade when 70% of buffer is healthy
    qualityUpgradeDelay: 5000,    // Wait 5 seconds before upgrading
    
    // Quality downgrade thresholds
    qualityDowngradeThreshold: 0.3, // Downgrade when buffer health drops below 30%
    
    // Buffer health monitoring
    bufferHealthThreshold: 0.8,     // Buffer is healthy when 80% is used
    minBufferLength: 10,            // Minimum buffer length in seconds
    
    // Network stability monitoring
    networkStabilityThreshold: 0.7, // Network is stable when 70% of requests succeed
    bandwidthTestInterval: 10000,   // Test bandwidth every 10 seconds
    
    // Progressive quality improvement
    progressiveUpgrade: true,       // Enable gradual quality improvement
    maxQualityLevels: 5,           // Maximum quality levels to consider
    qualityStepSize: 1,            // Upgrade one quality level at a time
    
    // VOD-specific settings
    vod: {
        aggressiveQualityUpgrade: true,
        qualityUpgradeInterval: 15000, // 15 seconds for VOD
        seekQualityOptimization: true, // Optimize quality after seeking
    },
    
    // Live-specific settings
    live: {
        conservativeQualityUpgrade: true,
        qualityUpgradeInterval: 30000, // 30 seconds for live
        realTimeQualityAdjustment: true,
    },
};

/**
 * Performance optimization settings
 */
export const PERFORMANCE_CONFIG = {
    // HLS configuration
    hls: {
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 120,
        maxBufferLength: 300,
        maxBufferSize: 120 * 1000 * 1000, // 120MB
        startLevel: -1, // Auto-select best quality
        progressive: true, // Enable progressive loading
    },
    
    // Buffering strategy
    buffering: {
        aggressiveBuffering: true,
        bufferAheadSeconds: 180, // Buffer 3 minutes ahead
        seekBufferSize: 60,      // 1 minute buffer for seeking
        prefetchThreshold: 0.8,  // Start prefetching when 80% through current buffer
    },
    
    // Control accessibility
    controls: {
        keepVisible: true,
        inactivityTimeout: 0,
        enableHotkeys: true,
        enableDoubleClick: true,
    },
};

/**
 * Get configuration based on device capabilities
 */
export function getDeviceOptimizedConfig(): VideoPlayerConfig {
    const config = { ...DEFAULT_VIDEO_PLAYER_CONFIG };
    
    // Check for mobile devices
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        config.startWithLowQuality = true;
        config.enableAdaptiveQuality = true;
    }
    
    // Check for low-end devices
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
        config.startWithLowQuality = true;
        config.enableAdaptiveQuality = true;
    }
    
    // Check for slow network
    if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
            config.startWithLowQuality = true;
            config.enableAdaptiveQuality = true;
        }
    }
    
    return config;
}

/**
 * Get adaptive quality configuration for specific content type
 */
export function getAdaptiveQualityConfig(isVod: boolean = false) {
    const baseConfig = { ...ADAPTIVE_QUALITY_CONFIG };
    
    if (isVod) {
        return { ...baseConfig, ...baseConfig.vod };
    } else {
        return { ...baseConfig, ...baseConfig.live };
    }
}


