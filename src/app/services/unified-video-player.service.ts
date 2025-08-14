import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AdaptiveQualityService } from './adaptive-quality.service';
import { VideoPerformanceService } from './video-performance.service';

export interface VideoPlayerConfig {
    playerType: 'videojs' | 'html5' | 'mpv' | 'vlc';
    enableAdaptiveQuality: boolean;
    startWithLowQuality: boolean;
    enableControls: boolean;
    autoplay: boolean;
    muted: boolean;
}

export interface VideoPlayerState {
    isPlaying: boolean;
    currentQuality: number;
    bufferHealth: number;
    networkStability: number;
    controlsAccessible: boolean;
    error: string | null;
}

@Injectable({
    providedIn: 'root',
})
export class UnifiedVideoPlayerService {
    private playerState$ = new BehaviorSubject<VideoPlayerState>({
        isPlaying: false,
        currentQuality: -1,
        bufferHealth: 1.0,
        networkStability: 1.0,
        controlsAccessible: true,
        error: null,
    });

    private currentConfig: VideoPlayerConfig = {
        playerType: 'videojs',
        enableAdaptiveQuality: true,
        startWithLowQuality: true,
        enableControls: true,
        autoplay: true,
        muted: false,
    };

    constructor(
        private adaptiveQualityService: AdaptiveQualityService,
        private videoPerformanceService: VideoPerformanceService
    ) {}

    /**
     * Get the current video player state
     */
    getPlayerState(): Observable<VideoPlayerState> {
        return this.playerState$.asObservable();
    }

    /**
     * Update video player configuration
     */
    updateConfig(config: Partial<VideoPlayerConfig>): void {
        this.currentConfig = { ...this.currentConfig, ...config };
        console.log('Video player config updated:', this.currentConfig);
    }

    /**
     * Get current configuration
     */
    getConfig(): VideoPlayerConfig {
        return { ...this.currentConfig };
    }

    /**
     * Initialize adaptive quality for a stream
     */
    initializeAdaptiveQuality(streamUrl: string, hls: any, isVod: boolean): void {
        if (!this.currentConfig.enableAdaptiveQuality) {
            console.log('Adaptive quality disabled in config');
            return;
        }

        try {
            this.adaptiveQualityService.initializeAdaptiveQuality(streamUrl, hls, isVod);
            console.log('Adaptive quality initialized for stream:', streamUrl);
            
            // Update state to reflect adaptive quality is active
            this.updatePlayerState({
                currentQuality: -1, // Auto-select
                bufferHealth: 1.0,
                networkStability: 1.0,
            });
        } catch (error) {
            console.warn('Failed to initialize adaptive quality:', error);
            this.updatePlayerState({ error: 'Failed to initialize adaptive quality' });
        }
    }

    /**
     * Get adaptive quality configuration
     */
    getAdaptiveQualityConfig(isVod: boolean): any {
        return this.videoPerformanceService.getAdaptiveQualityConfig(isVod);
    }

    /**
     * Update player state
     */
    private updatePlayerState(updates: Partial<VideoPlayerState>): void {
        const currentState = this.playerState$.value;
        const newState = { ...currentState, ...updates };
        this.playerState$.next(newState);
    }

    /**
     * Report player error
     */
    reportError(error: string): void {
        this.updatePlayerState({ error });
        console.error('Video player error:', error);
    }

    /**
     * Clear player error
     */
    clearError(): void {
        this.updatePlayerState({ error: null });
    }

    /**
     * Update playback state
     */
    updatePlaybackState(isPlaying: boolean): void {
        this.updatePlayerState({ isPlaying });
    }

    /**
     * Update quality metrics
     */
    updateQualityMetrics(quality: number, bufferHealth: number, networkStability: number): void {
        this.updatePlayerState({
            currentQuality: quality,
            bufferHealth,
            networkStability,
        });
    }

    /**
     * Update controls accessibility
     */
    updateControlsAccessibility(accessible: boolean): void {
        this.updatePlayerState({ controlsAccessible: accessible });
    }

    /**
     * Clean up resources for a stream
     */
    cleanup(streamUrl: string): void {
        try {
            this.adaptiveQualityService.cleanup(streamUrl);
            console.log('Cleaned up resources for stream:', streamUrl);
        } catch (error) {
            console.warn('Error during cleanup:', error);
        }
    }

    /**
     * Get performance configuration for video player
     */
    getPerformanceConfig(isVod: boolean): any {
        return this.videoPerformanceService.getBandwidthOptimizedHlsConfig(isVod);
    }

    /**
     * Check if adaptive quality is supported for the current stream
     */
    isAdaptiveQualitySupported(streamUrl: string): boolean {
        return this.currentConfig.enableAdaptiveQuality && 
               (streamUrl.includes('.m3u8') || streamUrl.includes('.m3u'));
    }

    /**
     * Get recommended player type based on stream and device capabilities
     */
    getRecommendedPlayerType(streamUrl: string): string {
        // For HLS streams, prefer VideoJS with adaptive quality
        if (this.isAdaptiveQualitySupported(streamUrl)) {
            return 'videojs';
        }
        
        // For other formats, use HTML5 player
        return 'html5';
    }
}
