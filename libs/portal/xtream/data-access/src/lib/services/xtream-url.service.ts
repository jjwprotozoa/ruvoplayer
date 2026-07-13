import { inject, Injectable } from '@angular/core';
import {
    normalizeXtreamServerUrl,
    XtreamSerieEpisode,
    XtreamVodDetails,
} from '@iptvnator/shared/interfaces';
import {
    DatabaseService,
    RuntimeCapabilitiesService,
    SettingsStore,
} from '@iptvnator/services';
import { XtreamCredentials } from './xtream-api.service';

/**
 * Extended playlist with optional HTTP headers
 */
export interface XtreamPlaylistWithHeaders extends XtreamCredentials {
    id: string;
    name: string;
    type?: string;
    userAgent?: string;
    referrer?: string;
    origin?: string;
}

/**
 * Live stream item with xtream_id
 */
export interface LiveStreamItem {
    xtream_id: number;
    [key: string]: unknown;
}

type XtreamVodStreamLike = XtreamVodDetails & {
    readonly stream_id?: number;
};

type XtreamCatchupScheme = 'rest' | 'legacy';

interface NormalizedXtreamCredentials {
    password: string;
    rawPassword: string;
    rawUsername: string;
    serverUrl: string;
    username: string;
}

type XtreamProbeApi = {
    xtreamProbeUrl?: (
        url: string,
        method?: 'GET' | 'HEAD'
    ) => Promise<{ status: number }>;
};

const XTREAM_CATCHUP_SCHEME_KEY_PREFIX = 'xtream-catchup-scheme:';

/**
 * Service for constructing Xtream stream URLs.
 * Handles URL construction for live streams, VOD, and series episodes.
 */
@Injectable({ providedIn: 'root' })
export class XtreamUrlService {
    private readonly databaseService = inject(DatabaseService);
    private readonly runtime = inject(RuntimeCapabilitiesService);
    private readonly settingsStore = inject(SettingsStore);
    private readonly catchupSchemeCache = new Map<
        string,
        XtreamCatchupScheme
    >();
    private readonly catchupSchemeRequests = new Map<
        string,
        Promise<XtreamCatchupScheme>
    >();

    /**
     * Construct live stream URL
     * Format: {serverUrl}/live/{username}/{password}/{streamId}.{format}
     * In PWA mode, the URL is wrapped through the stream proxy to handle CORS.
     */
    constructLiveUrl(
        credentials: XtreamCredentials,
        xtreamId: number,
        format?: string
    ): string {
        const normalizedCredentials = this.normalizeCredentials(credentials);
        if (!normalizedCredentials) {
            return '';
        }

        const streamFormat = this.resolveLiveStreamFormat(
            credentials,
            format ?? this.settingsStore.streamFormat() ?? 'ts'
        );
        const rawUrl = `${normalizedCredentials.serverUrl}/live/${normalizedCredentials.username}/${normalizedCredentials.password}/${xtreamId}.${streamFormat}`;
        return this.runtime.wrapStreamUrlForProxy(rawUrl);
    }

    /**
     * Construct VOD stream URL
     * Format: {serverUrl}/movie/{username}/{password}/{streamId}.{extension}
     * In PWA mode, MKV/AVI containers are converted to m3u8 (HLS) since browsers
     * cannot decode them natively. Most Xtream servers support serving VOD as HLS.
     * The URL is also wrapped through the stream proxy to handle CORS.
     */
    constructVodUrl(
        credentials: XtreamCredentials,
        vodItem: XtreamVodDetails
    ): string {
        const vod = vodItem as XtreamVodStreamLike;
        const streamId = vod.movie_data?.stream_id ?? vod.stream_id;
        const containerExtension = vodItem.movie_data?.container_extension;
        if (!streamId || !containerExtension) {
            return '';
        }
        const normalizedCredentials = this.normalizeCredentials(credentials);
        if (!normalizedCredentials) {
            return '';
        }

        const extension = this.resolvePwaPlaybackExtension(containerExtension);
        const rawUrl = `${normalizedCredentials.serverUrl}/movie/${normalizedCredentials.username}/${normalizedCredentials.password}/${streamId}.${extension}`;
        return this.runtime.wrapStreamUrlForProxy(rawUrl);
    }

    /**
     * Construct series episode stream URL
     * Format: {serverUrl}/series/{username}/{password}/{episodeId}.{extension}
     * In PWA mode, MKV/AVI containers are converted to m3u8 (HLS) since browsers
     * cannot decode them natively. Most Xtream servers support serving series as HLS.
     * The URL is also wrapped through the stream proxy to handle CORS.
     */
    constructEpisodeUrl(
        credentials: XtreamCredentials,
        episode: XtreamSerieEpisode
    ): string {
        const normalizedCredentials = this.normalizeCredentials(credentials);
        if (!normalizedCredentials) {
            return '';
        }

        const extension = this.resolvePwaPlaybackExtension(
            episode.container_extension
        );
        const rawUrl = `${normalizedCredentials.serverUrl}/series/${normalizedCredentials.username}/${normalizedCredentials.password}/${episode.id}.${extension}`;
        return this.runtime.wrapStreamUrlForProxy(rawUrl);
    }

    constructCatchupUrl(
        credentials: XtreamCredentials,
        streamId: number,
        startTimestamp: number,
        stopTimestamp: number,
        scheme: XtreamCatchupScheme,
        serverTimezone?: string
    ): string {
        const normalizedCredentials = this.normalizeCredentials(credentials);
        if (!normalizedCredentials) {
            return '';
        }

        const durationMinutes = Math.max(
            1,
            Math.round((stopTimestamp - startTimestamp) / 60)
        );
        const timeString = this.formatCatchupStartTime(
            startTimestamp,
            serverTimezone
        );

        let rawUrl: string;
        if (scheme === 'legacy') {
            const params = new URLSearchParams({
                username: normalizedCredentials.rawUsername,
                password: normalizedCredentials.rawPassword,
                stream: String(streamId),
                start: timeString,
                duration: String(durationMinutes),
            });
            rawUrl = `${normalizedCredentials.serverUrl}/streaming/timeshift.php?${params.toString()}`;
        } else {
            rawUrl = `${normalizedCredentials.serverUrl}/timeshift/${normalizedCredentials.username}/${normalizedCredentials.password}/${durationMinutes}/${timeString}/${streamId}.ts`;
        }

        return this.runtime.wrapStreamUrlForProxy(rawUrl);
    }

    async resolveCatchupUrl(
        playlistId: string,
        credentials: XtreamCredentials,
        streamId: number,
        startTimestamp: number,
        stopTimestamp: number,
        serverTimezone?: string
    ): Promise<string> {
        const scheme = await this.getCatchupScheme(
            playlistId,
            credentials,
            streamId,
            startTimestamp,
            stopTimestamp,
            serverTimezone
        );

        return this.constructCatchupUrl(
            credentials,
            streamId,
            startTimestamp,
            stopTimestamp,
            scheme,
            serverTimezone
        );
    }

    private async getCatchupScheme(
        playlistId: string,
        credentials: XtreamCredentials,
        streamId: number,
        startTimestamp: number,
        stopTimestamp: number,
        serverTimezone?: string
    ): Promise<XtreamCatchupScheme> {
        const cacheKey = `${XTREAM_CATCHUP_SCHEME_KEY_PREFIX}${playlistId}`;
        const cached = this.catchupSchemeCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const persisted = await this.databaseService.getAppState(cacheKey);
        if (persisted === 'rest' || persisted === 'legacy') {
            this.catchupSchemeCache.set(cacheKey, persisted);
            return persisted;
        }

        const inFlightRequest = this.catchupSchemeRequests.get(cacheKey);
        if (inFlightRequest) {
            return inFlightRequest;
        }

        const request = this.detectCatchupScheme(
            cacheKey,
            credentials,
            streamId,
            startTimestamp,
            stopTimestamp,
            serverTimezone
        ).finally(() => {
            this.catchupSchemeRequests.delete(cacheKey);
        });

        this.catchupSchemeRequests.set(cacheKey, request);
        return request;
    }

    private async detectCatchupScheme(
        cacheKey: string,
        credentials: XtreamCredentials,
        streamId: number,
        startTimestamp: number,
        stopTimestamp: number,
        serverTimezone?: string
    ): Promise<XtreamCatchupScheme> {
        const restUrl = this.constructCatchupUrl(
            credentials,
            streamId,
            startTimestamp,
            stopTimestamp,
            'rest',
            serverTimezone
        );
        const legacyUrl = this.constructCatchupUrl(
            credentials,
            streamId,
            startTimestamp,
            stopTimestamp,
            'legacy',
            serverTimezone
        );

        if (!restUrl || !legacyUrl) {
            return 'rest';
        }

        const restStatus = await this.probeCatchupUrl(restUrl);
        let detectedScheme: XtreamCatchupScheme;

        if (this.isAcceptedCatchupProbeStatus(restStatus)) {
            detectedScheme = 'rest';
        } else {
            const legacyStatus = await this.probeCatchupUrl(legacyUrl);
            detectedScheme = this.isAcceptedCatchupProbeStatus(legacyStatus)
                ? 'legacy'
                : restStatus === 404
                  ? 'legacy'
                  : 'rest';
        }

        this.catchupSchemeCache.set(cacheKey, detectedScheme);
        await this.databaseService.setAppState(cacheKey, detectedScheme);
        return detectedScheme;
    }

    private async probeCatchupUrl(url: string): Promise<number> {
        const probeUrl = (window.electron as XtreamProbeApi | undefined)
            ?.xtreamProbeUrl;

        if (typeof probeUrl !== 'function') {
            return 0;
        }

        try {
            const result = await probeUrl(url, 'HEAD');
            return Number(result?.status ?? 0);
        } catch {
            return 0;
        }
    }

    private isAcceptedCatchupProbeStatus(status: number): boolean {
        return (
            (status >= 200 && status < 400) ||
            status === 401 ||
            status === 403 ||
            status === 405
        );
    }

    private normalizeCredentials(
        credentials: XtreamCredentials
    ): NormalizedXtreamCredentials | null {
        const rawUsername = credentials.username.trim();
        const rawPassword = credentials.password.trim();
        if (!rawUsername || !rawPassword) {
            return null;
        }

        let serverUrl: string;
        try {
            serverUrl = normalizeXtreamServerUrl(credentials.serverUrl);
        } catch {
            return null;
        }

        return {
            password: encodeURIComponent(rawPassword),
            rawPassword,
            rawUsername,
            serverUrl,
            username: encodeURIComponent(rawUsername),
        };
    }

    private resolveLiveStreamFormat(
        credentials: XtreamCredentials,
        requestedFormat: string
    ): string {
        const requested = requestedFormat.trim();
        const allowedFormats = credentials.allowedOutputFormats
            ?.map((format) => format.trim())
            .filter(Boolean);

        if (allowedFormats?.length && !allowedFormats.includes(requested)) {
            return allowedFormats[0];
        }

        return requested;
    }

    /**
     * Convert container extensions that browsers cannot decode (MKV, AVI) to
     * m3u8 (HLS) when running in PWA mode. Most Xtream servers support serving
     * VOD and series content as HLS when the extension is changed.
     */
    private resolvePwaPlaybackExtension(containerExtension: string): string {
        const normalized = containerExtension.trim().toLowerCase();
        if (!this.runtime.isPwa) {
            return normalized;
        }

        if (normalized === 'mkv' || normalized === 'avi') {
            return 'm3u8';
        }

        return normalized;
    }

    private formatCatchupStartTime(
        timestamp: number,
        timezone?: string
    ): string {
        const date = new Date(timestamp * 1000);

        if (timezone) {
            try {
                const parts = new Intl.DateTimeFormat('en-CA', {
                    timeZone: timezone,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                }).formatToParts(date);
                const get = (type: Intl.DateTimeFormatPartTypes) =>
                    parts.find((p) => p.type === type)?.value ?? '00';
                return `${get('year')}-${get('month')}-${get('day')}:${get('hour')}-${get('minute')}`;
            } catch {
                // Invalid timezone string — fall through to local-time formatting
            }
        }

        const pad = (value: number) => String(value).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}:${pad(date.getHours())}-${pad(date.getMinutes())}`;
    }
}
