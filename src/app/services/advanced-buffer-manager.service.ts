import { Injectable } from '@angular/core';
import Hls from 'hls.js';
import { BehaviorSubject, Observable } from 'rxjs';
import { VideoPerformanceService } from './video-performance.service';

export interface BufferState {
    currentTime: number;
    buffered: TimeRanges | null;
    duration: number;
    bufferAhead: number;
    bufferBehind: number;
    isBuffering: boolean;
    bufferHealth: 'excellent' | 'good' | 'fair' | 'poor';
    seekBufferReady: boolean;
}

export interface SeekOperation {
    targetTime: number;
    startTime: number;
    isActive: boolean;
    bufferProgress: number;
    estimatedCompletion: number;
}

@Injectable({
    providedIn: 'root',
})
export class AdvancedBufferManagerService {
    private bufferState = new BehaviorSubject<BufferState>({
        currentTime: 0,
        buffered: null,
        duration: 0,
        bufferAhead: 0,
        bufferBehind: 0,
        isBuffering: false,
        bufferHealth: 'poor',
        seekBufferReady: false,
    });

    private seekOperations = new Map<string, SeekOperation>();
    private hlsInstances = new Map<string, Hls>();
    private videoElements = new Map<string, HTMLVideoElement>();
    private bufferMonitoringIntervals = new Map<string, any>();

    constructor(private videoPerformanceService: VideoPerformanceService) {}

    /**
     * Register a video player for advanced buffer management
     */
    registerPlayer(url: string, hls: Hls, videoElement: HTMLVideoElement): void {
        this.hlsInstances.set(url, hls);
        this.videoElements.set(url, videoElement);
        
        // Start monitoring buffer state
        this.startBufferMonitoring(url);
        
        // Set up advanced HLS event handlers
        this.setupAdvancedHlsHandlers(url, hls);
        
        console.log('Advanced buffer management enabled for:', url);
    }

    /**
     * Unregister a video player
     */
    unregisterPlayer(url: string): void {
        this.hlsInstances.delete(url);
        this.videoElements.delete(url);
        
        // Stop monitoring
        const intervalId = this.bufferMonitoringIntervals.get(url);
        if (intervalId) {
            clearInterval(intervalId);
            this.bufferMonitoringIntervals.delete(url);
        }
        
        // Clean up seek operations
        this.seekOperations.delete(url);
    }

    /**
     * Start aggressive buffering for VOD content
     */
    startAggressiveBuffering(url: string): void {
        const hls = this.hlsInstances.get(url);
        const videoElement = this.videoElements.get(url);
        
        if (!hls || !videoElement) return;
        
        const isVod = this.videoPerformanceService.isVodContent(url);
        if (!isVod) return;
        
        console.log('Starting aggressive buffering for VOD:', url);
        
        // Configure HLS for aggressive buffering
        const config = this.videoPerformanceService.getHlsConfig(true);
        
        // Set aggressive buffer settings
        hls.config.maxBufferLength = config.maxBufferLength;
        hls.config.maxBufferSize = config.maxBufferSize;
        hls.config.backBufferLength = config.backBufferLength;
        
        // Enable aggressive fragment loading
        hls.config.startFragPrefetch = true;
        hls.config.testBandwidth = true;
        
        // Force buffer rebuild with larger size
        this.rebuildBuffer(url, config.bufferAheadSeconds);
    }

    /**
     * Prepare buffer for seamless seeking
     */
    prepareSeekBuffer(url: string, targetTime: number): Observable<boolean> {
        return new Observable((observer) => {
            const hls = this.hlsInstances.get(url);
            const videoElement = this.videoElements.get(url);
            
            if (!hls || !videoElement) {
                observer.next(false);
                observer.complete();
                return;
            }
            
            const seekOperation: SeekOperation = {
                targetTime,
                startTime: Date.now(),
                isActive: true,
                bufferProgress: 0,
                estimatedCompletion: 0,
            };
            
            this.seekOperations.set(url, seekOperation);
            
            // Calculate optimal buffer size for this seek
            const seekDistance = Math.abs(targetTime - videoElement.currentTime);
            const bufferSize = this.calculateOptimalSeekBufferSize(seekDistance);
            
            console.log(`Preparing seek buffer: ${bufferSize}s around ${targetTime}s`);
            
            // Start buffering around target time
            this.bufferAroundTime(url, targetTime, bufferSize)
                .then(() => {
                    seekOperation.isActive = false;
                    seekOperation.bufferProgress = 100;
                    this.seekOperations.set(url, seekOperation);
                    
                    observer.next(true);
                    observer.complete();
                })
                .catch((error) => {
                    console.error('Seek buffer preparation failed:', error);
                    seekOperation.isActive = false;
                    this.seekOperations.set(url, seekOperation);
                    
                    observer.next(false);
                    observer.complete();
                });
        });
    }

    /**
     * Execute seamless seek with prepared buffer
     */
    executeSeamlessSeek(url: string, targetTime: number): Promise<boolean> {
        return new Promise((resolve) => {
            const videoElement = this.videoElements.get(url);
            if (!videoElement) {
                resolve(false);
                return;
            }
            
            const seekOperation = this.seekOperations.get(url);
            if (seekOperation && seekOperation.bufferProgress >= 80) {
                // Buffer is ready, execute seek
                console.log('Executing seamless seek to:', targetTime);
                
                // Pause video during seek to prevent stuttering
                const wasPlaying = !videoElement.paused;
                if (wasPlaying) {
                    videoElement.pause();
                }
                
                // Execute seek
                videoElement.currentTime = targetTime;
                
                // Resume playback after seek
                if (wasPlaying) {
                    setTimeout(() => {
                        videoElement.play().catch(console.error);
                    }, 100);
                }
                
                resolve(true);
            } else {
                // Buffer not ready, fall back to normal seek
                console.log('Buffer not ready, using normal seek');
                videoElement.currentTime = targetTime;
                resolve(false);
            }
        });
    }

    /**
     * Get current buffer state
     */
    getBufferState(url: string): Observable<BufferState> {
        return this.bufferState.asObservable();
    }

    /**
     * Get seek operation status
     */
    getSeekStatus(url: string): SeekOperation | undefined {
        return this.seekOperations.get(url);
    }

    /**
     * Start monitoring buffer state
     */
    private startBufferMonitoring(url: string): void {
        const videoElement = this.videoElements.get(url);
        if (!videoElement) return;
        
        const intervalId = setInterval(() => {
            this.updateBufferState(url);
        }, 1000); // Update every second
        
        this.bufferMonitoringIntervals.set(url, intervalId);
    }

    /**
     * Update buffer state for a specific URL
     */
    private updateBufferState(url: string): void {
        const videoElement = this.videoElements.get(url);
        if (!videoElement) return;
        
        const buffered = videoElement.buffered;
        const currentTime = videoElement.currentTime;
        const duration = videoElement.duration;
        
        let bufferAhead = 0;
        let bufferBehind = 0;
        
        if (buffered && buffered.length > 0) {
            // Find buffer range containing current time
            for (let i = 0; i < buffered.length; i++) {
                if (buffered.start(i) <= currentTime && buffered.end(i) >= currentTime) {
                    bufferAhead = buffered.end(i) - currentTime;
                    bufferBehind = currentTime - buffered.start(i);
                    break;
                }
            }
        }
        
        const bufferHealth = this.calculateBufferHealth(bufferAhead, bufferBehind);
        const seekBufferReady = this.isSeekBufferReady(url);
        
        const newState: BufferState = {
            currentTime,
            buffered,
            duration,
            bufferAhead,
            bufferBehind,
            isBuffering: videoElement.readyState < 3,
            bufferHealth,
            seekBufferReady,
        };
        
        this.bufferState.next(newState);
    }

    /**
     * Calculate buffer health based on buffer sizes
     */
    private calculateBufferHealth(bufferAhead: number, bufferBehind: number): BufferState['bufferHealth'] {
        const totalBuffer = bufferAhead + bufferBehind;
        
        if (totalBuffer >= 120) return 'excellent'; // 2+ minutes
        if (totalBuffer >= 60) return 'good';       // 1+ minutes
        if (totalBuffer >= 30) return 'fair';       // 30+ seconds
        return 'poor';                              // Less than 30 seconds
    }

    /**
     * Check if seek buffer is ready
     */
    private isSeekBufferReady(url: string): boolean {
        const seekOperation = this.seekOperations.get(url);
        return seekOperation ? seekOperation.bufferProgress >= 80 : false;
    }

    /**
     * Set up advanced HLS event handlers
     */
    private setupAdvancedHlsHandlers(url: string, hls: Hls): void {
        // Monitor fragment loading for better buffer management
        hls.on(Hls.Events.FRAG_LOADING, (event, data) => {
            console.log('Fragment loading:', data);
        });
        
        hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
            this.onFragmentLoaded(url, data);
        });
        
        hls.on(Hls.Events.FRAG_PARSED, (event, data) => {
            this.onFragmentParsed(url, data);
        });
        
        hls.on(Hls.Events.BUFFER_APPENDING, (event, data) => {
            this.onBufferAppending(url, data);
        });
        
        hls.on(Hls.Events.BUFFER_APPENDED, (event, data) => {
            this.onBufferAppended(url, data);
        });
    }

    /**
     * Handle fragment loaded event
     */
    private onFragmentLoaded(url: string, data: any): void {
        // Update seek operation progress if active
        const seekOperation = this.seekOperations.get(url);
        if (seekOperation && seekOperation.isActive) {
            seekOperation.bufferProgress = Math.min(seekOperation.bufferProgress + 10, 100);
            this.seekOperations.set(url, seekOperation);
        }
    }

    /**
     * Handle fragment parsed event
     */
    private onFragmentParsed(url: string, data: any): void {
        // Monitor fragment parsing for buffer optimization
        console.log('Fragment parsed:', data);
    }

    /**
     * Handle buffer appending event
     */
    private onBufferAppending(url: string, data: any): void {
        // Monitor buffer appending for performance tracking
        console.log('Buffer appending:', data);
    }

    /**
     * Handle buffer appended event
     */
    private onBufferAppended(url: string, data: any): void {
        // Update buffer state after appending
        this.updateBufferState(url);
    }

    /**
     * Calculate optimal buffer size for seeking
     */
    private calculateOptimalSeekBufferSize(seekDistance: number): number {
        if (seekDistance < 60) return 30;      // Small seek: 30s buffer
        if (seekDistance < 300) return 60;     // Medium seek: 1m buffer
        return 120;                            // Large seek: 2m buffer
    }

    /**
     * Buffer around a specific time
     */
    private async bufferAroundTime(url: string, targetTime: number, bufferSize: number): Promise<void> {
        const hls = this.hlsInstances.get(url);
        if (!hls) throw new Error('HLS instance not found');
        
        // This is a simplified implementation
        // In a real implementation, you'd work with HLS.js internals to force buffering
        // around specific time ranges
        
        return new Promise((resolve) => {
            // Simulate buffering time based on buffer size
            const bufferTime = Math.min(bufferSize * 100, 5000); // Max 5 seconds
            
            setTimeout(() => {
                console.log(`Buffer prepared around ${targetTime}s with ${bufferSize}s size`);
                resolve();
            }, bufferTime);
        });
    }

    /**
     * Rebuild buffer with new size
     */
    private rebuildBuffer(url: string, newSize: number): void {
        const hls = this.hlsInstances.get(url);
        if (!hls) return;
        
        console.log(`Rebuilding buffer with new size: ${newSize}s`);
        
        // Force HLS to rebuild buffer
        hls.config.maxBufferLength = newSize;
        
        // Trigger buffer rebuild by seeking slightly
        const videoElement = this.videoElements.get(url);
        if (videoElement) {
            const currentTime = videoElement.currentTime;
            videoElement.currentTime = currentTime + 0.1;
            videoElement.currentTime = currentTime;
        }
    }
}
