import { Injectable } from '@angular/core';
import Hls from 'hls.js';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { VideoPerformanceService } from './video-performance.service';

export interface QualityLevel {
    level: number;
    bitrate: number;
    width: number;
    height: number;
    url: string;
}

export interface AdaptiveQualityState {
    currentQuality: number;
    targetQuality: number;
    bufferHealth: number;
    networkStability: number;
    lastQualityChange: number;
    qualityHistory: QualityChange[];
}

interface QualityChange {
    timestamp: number;
    fromLevel: number;
    toLevel: number;
    reason: string;
    bufferHealth: number;
}

@Injectable({
    providedIn: 'root',
})
export class AdaptiveQualityService {
    private qualityStates = new Map<string, AdaptiveQualityState>();
    private qualityStates$ = new BehaviorSubject<Map<string, AdaptiveQualityState>>(new Map());
    
    // Quality monitoring intervals
    private monitoringIntervals = new Map<string, any>();
    
    constructor(private videoPerformanceService: VideoPerformanceService) {}

    /**
     * Initialize adaptive quality management for a stream
     * @param streamUrl The stream URL
     * @param hls The HLS instance
     * @param isVod Whether this is VOD content
     */
    initializeAdaptiveQuality(streamUrl: string, hls: Hls, isVod: boolean): void {
        const config = this.videoPerformanceService.getAdaptiveQualityConfig(isVod);
        const networkStrategy = this.getNetworkStrategy();
        
        // Create initial quality state
        const qualityState: AdaptiveQualityState = {
            currentQuality: -1, // Auto-select initially
            targetQuality: -1,
            bufferHealth: 1.0,
            networkStability: 1.0,
            lastQualityChange: Date.now(),
            qualityHistory: []
        };
        
        this.qualityStates.set(streamUrl, qualityState);
        this.updateQualityStates();
        
        // Start with lower quality if configured
        if (config.startWithLowQuality) {
            this.startWithLowerQuality(hls, isVod, networkStrategy);
        }
        
        // Start quality monitoring
        this.startQualityMonitoring(streamUrl, hls, isVod, config);
        
        // Set up HLS event listeners for quality management
        this.setupHlsQualityListeners(streamUrl, hls, isVod, config);
    }

    /**
     * Start with lower quality for faster initial loading
     */
    private startWithLowerQuality(hls: Hls, isVod: boolean, networkStrategy: any): void {
        if (!hls.levels || hls.levels.length === 0) return;
        
        // Find a lower quality level to start with
        const levels = hls.levels;
        const sortedLevels = [...levels].sort((a, b) => a.bitrate - b.bitrate);
        
        // Start with 25% quality level for faster loading
        const startLevelIndex = Math.floor(levels.length * 0.25);
        const startLevel = sortedLevels[startLevelIndex];
        
        if (startLevel) {
            console.log(`Starting with lower quality: ${startLevel.width}x${startLevel.height} (${startLevel.bitrate / 1000}kbps)`);
            hls.currentLevel = startLevelIndex;
            
            // Set target for gradual quality improvement
            const targetLevelIndex = Math.floor(levels.length * 0.75);
            hls.nextLevel = targetLevelIndex;
        }
    }

    /**
     * Start quality monitoring and adjustment
     */
    private startQualityMonitoring(streamUrl: string, hls: Hls, isVod: boolean, config: any): void {
        const intervalTime = config.bandwidthTestInterval || 10000;
        
        const monitoringInterval = interval(intervalTime).subscribe(() => {
            this.assessQualityAndAdjust(streamUrl, hls, isVod, config);
        });
        
        this.monitoringIntervals.set(streamUrl, monitoringInterval);
    }

    /**
     * Assess current quality and adjust if needed
     */
    private assessQualityAndAdjust(streamUrl: string, hls: Hls, isVod: boolean, config: any): void {
        const qualityState = this.qualityStates.get(streamUrl);
        if (!qualityState || !hls.levels) return;
        
        // Calculate buffer health
        const bufferHealth = this.calculateBufferHealth(hls);
        qualityState.bufferHealth = bufferHealth;
        
        // Calculate network stability
        const networkStability = this.calculateNetworkStability(hls);
        qualityState.networkStability = networkStability;
        
        // Determine if quality should be adjusted
        const shouldUpgrade = this.shouldUpgradeQuality(qualityState, config, isVod);
        const shouldDowngrade = this.shouldDowngradeQuality(qualityState, config);
        
        if (shouldUpgrade) {
            this.upgradeQuality(hls, isVod, qualityState);
        } else if (shouldDowngrade) {
            this.downgradeQuality(hls, qualityState);
        }
        
        this.updateQualityStates();
    }

    /**
     * Calculate buffer health percentage
     */
    private calculateBufferHealth(hls: Hls): number {
        try {
            const buffered = hls.media.buffered;
            if (buffered.length === 0) return 0;
            
            const currentTime = hls.media.currentTime;
            const bufferedEnd = buffered.end(buffered.length - 1);
            const bufferedStart = buffered.start(0);
            
            if (bufferedEnd <= bufferedStart) return 0;
            
            const bufferLength = bufferedEnd - currentTime;
            const totalBuffer = bufferedEnd - bufferedStart;
            
            return Math.min(bufferLength / totalBuffer, 1.0);
        } catch {
            return 0.5; // Default to 50% if calculation fails
        }
    }

    /**
     * Calculate network stability based on fragment loading
     */
    private calculateNetworkStability(hls: Hls): number {
        // This is a simplified calculation
        // In a real implementation, you'd track fragment loading times and errors
        return 0.8; // Default to 80% stability
    }

    /**
     * Determine if quality should be upgraded
     */
    private shouldUpgradeQuality(qualityState: AdaptiveQualityState, config: any, isVod: boolean): boolean {
        const timeSinceLastChange = Date.now() - qualityState.lastQualityChange;
        const minDelay = isVod ? config.vod?.qualityUpgradeInterval || 15000 : config.qualityUpgradeDelay || 5000;
        
        return (
            qualityState.bufferHealth > config.qualitySwitchThreshold &&
            qualityState.networkStability > 0.7 &&
            timeSinceLastChange > minDelay
        );
    }

    /**
     * Determine if quality should be downgraded
     */
    private shouldDowngradeQuality(qualityState: AdaptiveQualityState, config: any): boolean {
        return qualityState.bufferHealth < config.qualityDowngradeThreshold;
    }

    /**
     * Upgrade quality gradually
     */
    private upgradeQuality(hls: Hls, isVod: boolean, qualityState: AdaptiveQualityState): void {
        if (!hls.levels || hls.currentLevel === -1) return;
        
        const currentLevel = hls.currentLevel;
        const levels = hls.levels;
        
        // Find next higher quality level
        let nextLevel = currentLevel;
        for (let i = currentLevel + 1; i < levels.length; i++) {
            if (levels[i] && levels[i].bitrate > levels[currentLevel].bitrate) {
                nextLevel = i;
                break;
            }
        }
        
        if (nextLevel !== currentLevel) {
            const oldLevel = levels[currentLevel];
            const newLevel = levels[nextLevel];
            
            console.log(`Upgrading quality: ${oldLevel.width}x${oldLevel.height} → ${newLevel.width}x${newLevel.height}`);
            
            hls.currentLevel = nextLevel;
            qualityState.currentQuality = nextLevel;
            qualityState.lastQualityChange = Date.now();
            
            // Log quality change
            qualityState.qualityHistory.push({
                timestamp: Date.now(),
                fromLevel: currentLevel,
                toLevel: nextLevel,
                reason: 'buffer_health_improvement',
                bufferHealth: qualityState.bufferHealth
            });
            
            // Keep only last 10 quality changes
            if (qualityState.qualityHistory.length > 10) {
                qualityState.qualityHistory.shift();
            }
        }
    }

    /**
     * Downgrade quality to prevent buffering
     */
    private downgradeQuality(hls: Hls, qualityState: AdaptiveQualityState): void {
        if (!hls.levels || hls.currentLevel === -1) return;
        
        const currentLevel = hls.currentLevel;
        const levels = hls.levels;
        
        // Find next lower quality level
        let nextLevel = currentLevel;
        for (let i = currentLevel - 1; i >= 0; i--) {
            if (levels[i] && levels[i].bitrate < levels[currentLevel].bitrate) {
                nextLevel = i;
                break;
            }
        }
        
        if (nextLevel !== currentLevel) {
            const oldLevel = levels[currentLevel];
            const newLevel = levels[nextLevel];
            
            console.log(`Downgrading quality: ${oldLevel.width}x${oldLevel.height} → ${newLevel.width}x${newLevel.height} (buffer health: ${qualityState.bufferHealth.toFixed(2)})`);
            
            hls.currentLevel = nextLevel;
            qualityState.currentQuality = nextLevel;
            qualityState.lastQualityChange = Date.now();
            
            // Log quality change
            qualityState.qualityHistory.push({
                timestamp: Date.now(),
                fromLevel: currentLevel,
                toLevel: nextLevel,
                reason: 'buffer_health_degradation',
                bufferHealth: qualityState.bufferHealth
            });
            
            // Keep only last 10 quality changes
            if (qualityState.qualityHistory.length > 10) {
                qualityState.qualityHistory.shift();
            }
        }
    }

    /**
     * Set up HLS event listeners for quality management
     */
    private setupHlsQualityListeners(streamUrl: string, hls: Hls, isVod: boolean, config: any): void {
        // Monitor level switching
        hls.on(Hls.Events.LEVEL_SWITCHING, (event, data) => {
            const qualityState = this.qualityStates.get(streamUrl);
            if (qualityState) {
                qualityState.currentQuality = data.level;
                this.updateQualityStates();
            }
        });
        
        // Monitor buffer events
        hls.on(Hls.Events.BUFFER_APPENDING, () => {
            // Buffer is being built, quality might be stable
        });
        
        hls.on(Hls.Events.BUFFER_EOS, () => {
            // Buffer end of stream, consider downgrading quality
            const qualityState = this.qualityStates.get(streamUrl);
            if (qualityState) {
                qualityState.bufferHealth = Math.max(0, qualityState.bufferHealth - 0.1);
                this.updateQualityStates();
            }
        });
        
        // Monitor fragment loading for network issues
        hls.on(Hls.Events.FRAG_LOADING, () => {
            // Fragment loading started
        });
        
        hls.on(Hls.Events.FRAG_LOADED, () => {
            // Fragment loaded successfully
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
            // Handle fragment loading errors
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                const qualityState = this.qualityStates.get(streamUrl);
                if (qualityState) {
                    qualityState.networkStability = Math.max(0, qualityState.networkStability - 0.2);
                    this.updateQualityStates();
                }
            }
        });
    }

    /**
     * Get network strategy based on connection info
     */
    private getNetworkStrategy(): any {
        if ('connection' in navigator) {
            const connection = (navigator as any).connection;
            return this.videoPerformanceService.getNetworkAwareQualityStrategy(
                connection.type,
                connection.effectiveType
            );
        }
        
        return {
            startQuality: 'auto',
            maxQuality: 'auto',
            qualityUpgradeStrategy: 'balanced',
            bufferStrategy: 'balanced'
        };
    }

    /**
     * Get quality state for a stream
     */
    getQualityState(streamUrl: string): AdaptiveQualityState | undefined {
        return this.qualityStates.get(streamUrl);
    }

    /**
     * Get all quality states observable
     */
    getQualityStates(): Observable<Map<string, AdaptiveQualityState>> {
        return this.qualityStates$.asObservable();
    }

    /**
     * Manually set quality level
     */
    setQualityLevel(streamUrl: string, level: number): void {
        const qualityState = this.qualityStates.get(streamUrl);
        if (qualityState) {
            qualityState.currentQuality = level;
            qualityState.lastQualityChange = Date.now();
            this.updateQualityStates();
        }
    }

    /**
     * Clean up quality management for a stream
     */
    cleanup(streamUrl: string): void {
        // Stop monitoring interval
        const interval = this.monitoringIntervals.get(streamUrl);
        if (interval) {
            interval.unsubscribe();
            this.monitoringIntervals.delete(streamUrl);
        }
        
        // Remove quality state
        this.qualityStates.delete(streamUrl);
        this.updateQualityStates();
    }

    /**
     * Update quality states subject
     */
    private updateQualityStates(): void {
        this.qualityStates$.next(new Map(this.qualityStates));
    }
}
