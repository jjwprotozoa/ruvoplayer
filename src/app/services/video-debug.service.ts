import { Injectable } from '@angular/core';
import Hls from 'hls.js';

export interface VideoDebugInfo {
    url: string;
    contentType: 'VOD' | 'Live' | 'Unknown';
    extension: string;
    hlsSupported: boolean;
    videoElementState: {
        readyState: number; // This is valid for HTMLVideoElement
        networkState: number;
        paused: boolean;
        ended: boolean;
        currentSrc: string;
        src: string;
        videoWidth: number;
        videoHeight: number;
        duration: number;
        currentTime: number;
        buffered: TimeRanges | null;
    };
    hlsState?: {
        levels: any[];
        currentLevel: number;
        autoLevelEnabled: boolean;
        buffered: TimeRanges | null;
    };
    errors: string[];
    warnings: string[];
}

@Injectable({
    providedIn: 'root',
})
export class VideoDebugService {
    private debugInfo: VideoDebugInfo[] = [];
    private maxDebugEntries = 50;

    /**
     * Log video debug information
     */
    logVideoDebug(url: string, videoElement: HTMLVideoElement, hls?: Hls): void {
        const debugInfo: VideoDebugInfo = {
            url,
            contentType: this.detectContentType(url),
            extension: this.getExtensionFromUrl(url),
            hlsSupported: Hls.isSupported(),
            videoElementState: {
                readyState: videoElement.readyState,
                networkState: videoElement.networkState,
                paused: videoElement.paused,
                ended: videoElement.ended,
                currentSrc: videoElement.currentSrc,
                src: videoElement.src,
                videoWidth: videoElement.videoWidth,
                videoHeight: videoElement.videoHeight,
                duration: videoElement.duration,
                currentTime: videoElement.currentTime,
                buffered: videoElement.buffered,
            },
            errors: [],
            warnings: [],
        };

        if (hls) {
            try {
                debugInfo.hlsState = {
                    levels: hls.levels || [],
                    currentLevel: hls.currentLevel,
                    autoLevelEnabled: hls.autoLevelEnabled,
                    buffered: videoElement.buffered,
                };
            } catch (error) {
                debugInfo.warnings.push(`Failed to get HLS state: ${error}`);
            }
        }

        this.debugInfo.unshift(debugInfo);
        
        // Keep only the last N entries
        if (this.debugInfo.length > this.maxDebugEntries) {
            this.debugInfo = this.debugInfo.slice(0, this.maxDebugEntries);
        }

        console.log('Video Debug Info:', debugInfo);
    }

    /**
     * Log video error
     */
    logVideoError(url: string, error: any): void {
        const debugEntry = this.debugInfo.find(entry => entry.url === url);
        if (debugEntry) {
            debugEntry.errors.push(typeof error === 'string' ? error : JSON.stringify(error));
        }
        console.error('Video Error for URL:', url, error);
    }

    /**
     * Log video warning
     */
    logVideoWarning(url: string, warning: string): void {
        const debugEntry = this.debugInfo.find(entry => entry.url === url);
        if (debugEntry) {
            debugEntry.warnings.push(warning);
        }
        console.warn('Video Warning for URL:', url, warning);
    }

    /**
     * Get debug information for a specific URL
     */
    getDebugInfo(url: string): VideoDebugInfo | undefined {
        return this.debugInfo.find(entry => entry.url === url);
    }

    /**
     * Get all debug information
     */
    getAllDebugInfo(): VideoDebugInfo[] {
        return [...this.debugInfo];
    }

    /**
     * Clear debug information
     */
    clearDebugInfo(): void {
        this.debugInfo = [];
    }

    /**
     * Detect content type from URL
     */
    private detectContentType(url: string): 'VOD' | 'Live' | 'Unknown' {
        const lowerUrl = url.toLowerCase();
        
        if (lowerUrl.includes('/movie/') || lowerUrl.includes('/vod/') || 
            lowerUrl.includes('/film/') || lowerUrl.includes('/series/')) {
            return 'VOD';
        }
        
        if (lowerUrl.includes('/live/') || lowerUrl.includes('/stream/') || 
            lowerUrl.includes('/channel/')) {
            return 'Live';
        }
        
        return 'Unknown';
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
     * Get diagnostic information for troubleshooting
     */
    getDiagnosticInfo(): any {
        return {
            browser: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine,
            },
            video: {
                canPlayType: {
                    'video/mp4': document.createElement('video').canPlayType('video/mp4'),
                    'video/webm': document.createElement('video').canPlayType('video/webm'),
                    'application/x-mpegURL': document.createElement('video').canPlayType('application/x-mpegURL'),
                },
                hlsSupported: Hls.isSupported(),
                hlsVersion: Hls.version,
            },
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth,
            },
            window: {
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight,
                devicePixelRatio: window.devicePixelRatio,
            },
            debugEntries: this.debugInfo.length,
        };
    }
}
