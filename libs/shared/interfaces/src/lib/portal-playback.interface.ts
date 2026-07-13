import { PlaybackPositionData } from './playback-position.interface';

export interface PlayerContentInfo extends Omit<
    PlaybackPositionData,
    'positionSeconds' | 'durationSeconds' | 'updatedAt'
> {
    playlistId: string;
}

export interface ResolvedPortalPlayback {
    streamUrl: string;
    /** Direct provider URL for external players (VLC/IINA) and copy actions. */
    externalStreamUrl?: string;
    title: string;
    thumbnail?: string | null;
    isLive?: boolean;
    startTime?: number;
    contentInfo?: PlayerContentInfo;
    headers?: Record<string, string>;
    userAgent?: string;
    referer?: string;
    origin?: string;
}
