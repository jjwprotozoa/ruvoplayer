import { Injectable } from '@angular/core';
import Hls from 'hls.js';
import { BehaviorSubject, Observable } from 'rxjs';
import { AdvancedBufferManagerService } from './advanced-buffer-manager.service';
import { VideoPerformanceService } from './video-performance.service';

export interface SeekRequest {
    id: string;
    targetTime: number;
    currentTime: number;
    seekType: 'instant' | 'smooth' | 'precise';
    priority: 'low' | 'normal' | 'high';
    timestamp: number;
}

export interface SeekResult {
    id: string;
    success: boolean;
    actualTime: number;
    bufferReady: boolean;
    seekDuration: number;
    error?: string;
}

export interface SeekPreview {
    targetTime: number;
    thumbnailUrl?: string;
    bufferStatus: 'ready' | 'loading' | 'not_ready';
    estimatedLoadTime: number;
}

@Injectable({
    providedIn: 'root',
})
export class SeamlessSeekingService {
    private seekRequests = new Map<string, SeekRequest>();
    private seekResults = new BehaviorSubject<SeekResult[]>([]);
    private currentSeek = new BehaviorSubject<SeekRequest | null>(null);
    private seekPreview = new BehaviorSubject<SeekPreview | null>(null);
    
    private hlsInstances = new Map<string, Hls>();
    private videoElements = new Map<string, HTMLVideoElement>();
    private seekTimeouts = new Map<string, any>();

    constructor(
        private advancedBufferManager: AdvancedBufferManagerService,
        private videoPerformanceService: VideoPerformanceService
    ) {}

    /**
     * Register a video player for seamless seeking
     */
    registerPlayer(url: string, hls: Hls, videoElement: HTMLVideoElement): void {
        this.hlsInstances.set(url, hls);
        this.videoElements.set(url, videoElement);
        
        // Set up seeking event listeners
        this.setupSeekingEventListeners(url, videoElement);
        
        console.log('Seamless seeking enabled for:', url);
    }

    /**
     * Unregister a video player
     */
    unregisterPlayer(url: string): void {
        this.hlsInstances.delete(url);
        this.videoElements.delete(url);
        
        // Clear any pending seek timeouts
        const timeoutId = this.seekTimeouts.get(url);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.seekTimeouts.delete(url);
        }
    }

    /**
     * Execute seamless seek with intelligent buffering
     */
    executeSeamlessSeek(url: string, targetTime: number, seekType: 'instant' | 'smooth' | 'precise' = 'smooth'): Observable<SeekResult> {
        return new Observable((observer) => {
            const videoElement = this.videoElements.get(url);
            if (!videoElement) {
                observer.next({
                    id: this.generateSeekId(),
                    success: false,
                    actualTime: targetTime,
                    bufferReady: false,
                    seekDuration: 0,
                    error: 'Video element not found'
                });
                observer.complete();
                return;
            }

            const seekId = this.generateSeekId();
            const currentTime = videoElement.currentTime;
            const seekDistance = Math.abs(targetTime - currentTime);

            const seekRequest: SeekRequest = {
                id: seekId,
                targetTime,
                currentTime,
                seekType,
                priority: this.determineSeekPriority(seekDistance, seekType),
                timestamp: Date.now()
            };

            this.seekRequests.set(seekId, seekRequest);
            this.currentSeek.next(seekRequest);

            console.log(`Executing ${seekType} seek from ${currentTime}s to ${targetTime}s`);

            // Execute seek based on type
            switch (seekType) {
                case 'instant':
                    this.executeInstantSeek(url, seekRequest, observer);
                    break;
                case 'smooth':
                    this.executeSmoothSeek(url, seekRequest, observer);
                    break;
                case 'precise':
                    this.executePreciseSeek(url, seekRequest, observer);
                    break;
            }
        });
    }

    /**
     * Execute instant seek (immediate jump)
     */
    private executeInstantSeek(url: string, seekRequest: SeekRequest, observer: any): void {
        const videoElement = this.videoElements.get(url);
        if (!videoElement) return;

        const startTime = Date.now();
        
        // Pause video during seek
        const wasPlaying = !videoElement.paused;
        if (wasPlaying) {
            videoElement.pause();
        }

        // Execute seek immediately
        videoElement.currentTime = seekRequest.targetTime;

        // Resume playback after seek
        if (wasPlaying) {
            setTimeout(() => {
                videoElement.play().catch(console.error);
            }, 50);
        }

        const seekDuration = Date.now() - startTime;
        
        const result: SeekResult = {
            id: seekRequest.id,
            success: true,
            actualTime: seekRequest.targetTime,
            bufferReady: true,
            seekDuration
        };

        observer.next(result);
        observer.complete();
        
        this.seekResults.next([...this.seekResults.value, result]);
        this.currentSeek.next(null);
    }

    /**
     * Execute smooth seek with buffer preparation
     */
    private executeSmoothSeek(url: string, seekRequest: SeekRequest, observer: any): void {
        const startTime = Date.now();
        
        // Prepare buffer around target time
        this.advancedBufferManager.prepareSeekBuffer(url, seekRequest.targetTime)
            .subscribe(
                (bufferReady) => {
                    if (bufferReady) {
                        // Execute seamless seek with prepared buffer
                        this.advancedBufferManager.executeSeamlessSeek(url, seekRequest.targetTime)
                            .then((seamless) => {
                                const seekDuration = Date.now() - startTime;
                                
                                const result: SeekResult = {
                                    id: seekRequest.id,
                                    success: true,
                                    actualTime: seekRequest.targetTime,
                                    bufferReady: true,
                                    seekDuration
                                };

                                observer.next(result);
                                observer.complete();
                                
                                this.seekResults.next([...this.seekResults.value, result]);
                                this.currentSeek.next(null);
                            });
                    } else {
                        // Fall back to instant seek
                        this.executeInstantSeek(url, seekRequest, observer);
                    }
                },
                (error) => {
                    console.error('Smooth seek failed, falling back to instant:', error);
                    this.executeInstantSeek(url, seekRequest, observer);
                }
            );
    }

    /**
     * Execute precise seek with maximum buffer preparation
     */
    private executePreciseSeek(url: string, seekRequest: SeekRequest, observer: any): void {
        const startTime = Date.now();
        
        // For precise seeks, we want maximum buffer preparation
        console.log('Preparing maximum buffer for precise seek');
        
        // Start aggressive buffering
        this.advancedBufferManager.startAggressiveBuffering(url);
        
        // Wait for optimal buffer state
        const checkBufferInterval = setInterval(() => {
            const bufferState = this.advancedBufferManager.getBufferState(url);
            bufferState.subscribe(state => {
                if (state.bufferHealth === 'excellent' || state.bufferHealth === 'good') {
                    clearInterval(checkBufferInterval);
                    
                    // Execute seek with optimal buffer
                    this.advancedBufferManager.executeSeamlessSeek(url, seekRequest.targetTime)
                        .then((seamless) => {
                            const seekDuration = Date.now() - startTime;
                            
                            const result: SeekResult = {
                                id: seekRequest.id,
                                success: true,
                                actualTime: seekRequest.targetTime,
                                bufferReady: true,
                                seekDuration
                            };

                            observer.next(result);
                            observer.complete();
                            
                            this.seekResults.next([...this.seekResults.value, result]);
                            this.currentSeek.next(null);
                        });
                }
            });
        }, 100);

        // Set timeout for precise seek
        const timeoutId = setTimeout(() => {
            clearInterval(checkBufferInterval);
            console.warn('Precise seek timeout, falling back to smooth seek');
            this.executeSmoothSeek(url, seekRequest, observer);
        }, 10000); // 10 second timeout

        this.seekTimeouts.set(url, timeoutId);
    }

    /**
     * Fast forward with intelligent buffering
     */
    fastForward(url: string, speed: number = 2.0): Observable<boolean> {
        return new Observable((observer) => {
            const videoElement = this.videoElements.get(url);
            if (!videoElement) {
                observer.next(false);
                observer.complete();
                return;
            }

            // Increase playback rate
            videoElement.playbackRate = speed;
            
            // Start aggressive buffering during fast forward
            this.advancedBufferManager.startAggressiveBuffering(url);
            
            // Monitor buffer health during fast forward
            const bufferMonitor = this.advancedBufferManager.getBufferState(url)
                .subscribe(state => {
                    if (state.bufferHealth === 'poor') {
                        // Reduce speed if buffer is poor
                        videoElement.playbackRate = Math.max(1.0, speed * 0.8);
                    } else if (state.bufferHealth === 'excellent') {
                        // Increase speed if buffer is excellent
                        videoElement.playbackRate = Math.min(4.0, speed * 1.2);
                    }
                });

            observer.next(true);
            observer.complete();

            // Clean up buffer monitor after a delay
            setTimeout(() => {
                bufferMonitor.unsubscribe();
            }, 5000);
        });
    }

    /**
     * Rewind with intelligent buffering
     */
    rewind(url: string, speed: number = 2.0): Observable<boolean> {
        return new Observable((observer) => {
            const videoElement = this.videoElements.get(url);
            if (!videoElement) {
                observer.next(false);
                observer.complete();
                return;
            }

            // For rewind, we need to seek backwards
            const currentTime = videoElement.currentTime;
            const rewindAmount = 10; // Rewind 10 seconds
            const targetTime = Math.max(0, currentTime - rewindAmount);

            // Execute smooth seek backwards
            this.executeSeamlessSeek(url, targetTime, 'smooth')
                .subscribe(result => {
                    if (result.success) {
                        // Resume normal playback
                        videoElement.playbackRate = 1.0;
                        observer.next(true);
                    } else {
                        observer.next(false);
                    }
                    observer.complete();
                });
        });
    }

    /**
     * Get seek preview information
     */
    getSeekPreview(url: string, targetTime: number): Observable<SeekPreview> {
        return new Observable((observer) => {
            const videoElement = this.videoElements.get(url);
            if (!videoElement) {
                observer.next({
                    targetTime,
                    bufferStatus: 'not_ready',
                    estimatedLoadTime: 0
                });
                observer.complete();
                return;
            }

            // Check if target time is already buffered
            const buffered = videoElement.buffered;
            let bufferStatus: 'ready' | 'loading' | 'not_ready' = 'not_ready';
            let estimatedLoadTime = 0;

            if (buffered && buffered.length > 0) {
                for (let i = 0; i < buffered.length; i++) {
                    if (buffered.start(i) <= targetTime && buffered.end(i) >= targetTime) {
                        bufferStatus = 'ready';
                        estimatedLoadTime = 0;
                        break;
                    }
                }
            }

            if (bufferStatus === 'not_ready') {
                // Estimate load time based on seek distance and network conditions
                const currentTime = videoElement.currentTime;
                const seekDistance = Math.abs(targetTime - currentTime);
                estimatedLoadTime = this.estimateLoadTime(seekDistance);
                
                // Start pre-buffering for preview
                this.advancedBufferManager.prepareSeekBuffer(url, targetTime)
                    .subscribe(bufferReady => {
                        if (bufferReady) {
                            bufferStatus = 'ready';
                            estimatedLoadTime = 0;
                        }
                    });
            }

            const preview: SeekPreview = {
                targetTime,
                bufferStatus,
                estimatedLoadTime
            };

            observer.next(preview);
            observer.complete();
        });
    }

    /**
     * Get current seek status
     */
    getCurrentSeek(): Observable<SeekRequest | null> {
        return this.currentSeek.asObservable();
    }

    /**
     * Get seek results history
     */
    getSeekResults(): Observable<SeekResult[]> {
        return this.seekResults.asObservable();
    }

    /**
     * Get seek preview
     */
    getSeekPreviewObservable(): Observable<SeekPreview | null> {
        return this.seekPreview.asObservable();
    }

    /**
     * Setup seeking event listeners
     */
    private setupSeekingEventListeners(url: string, videoElement: HTMLVideoElement): void {
        // Monitor seeking events
        videoElement.addEventListener('seeking', () => {
            console.log('Video seeking started');
        });

        videoElement.addEventListener('seeked', () => {
            console.log('Video seek completed');
        });

        // Monitor time updates during seeking
        videoElement.addEventListener('timeupdate', () => {
            // This will be called frequently during playback
        });
    }

    /**
     * Determine seek priority based on distance and type
     */
    private determineSeekPriority(seekDistance: number, seekType: string): 'low' | 'normal' | 'high' {
        if (seekType === 'precise') return 'high';
        if (seekDistance > 300) return 'high'; // Large seeks get high priority
        if (seekDistance > 60) return 'normal';
        return 'low';
    }

    /**
     * Estimate load time for a seek operation
     */
    private estimateLoadTime(seekDistance: number): number {
        // Simplified estimation based on seek distance
        if (seekDistance < 60) return 1000;      // 1 second for small seeks
        if (seekDistance < 300) return 3000;     // 3 seconds for medium seeks
        return 5000;                             // 5 seconds for large seeks
    }

    /**
     * Generate unique seek ID
     */
    private generateSeekId(): string {
        return `seek_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
