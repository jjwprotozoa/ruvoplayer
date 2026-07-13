import type {
    HlsPlaybackErrorInput,
    MpegTsPlaybackErrorInput,
} from './playback-diagnostics.model';

export function normalizeErrorDetails(
    error: HlsPlaybackErrorInput | MpegTsPlaybackErrorInput
): string {
    const hlsError = 'error' in error ? error.error : undefined;
    const mpegTsInfo = 'info' in error ? error.info : undefined;
    const errorMessage = normalizeErrorPayload(hlsError);
    const info = normalizeErrorPayload(mpegTsInfo);

    return [error.details, error.message, errorMessage, info]
        .filter((part): part is string => Boolean(part))
        .join(' ');
}

export function isNetworkFailure(type: string, details: string): boolean {
    return (
        type.includes('network') ||
        details.includes('network') ||
        details.includes('loaderror') ||
        details.includes('timeout') ||
        details.includes('status')
    );
}

export function extractHttpStatus(
    details: string,
    error?: unknown
): number | undefined {
    const fromPayload = extractHttpStatusFromPayload(error);
    if (fromPayload !== undefined) {
        return fromPayload;
    }

    return extractHttpStatusFromText(details);
}

export function isStreamNotFoundStatus(
    httpStatus: number | undefined,
    details: string
): boolean {
    if (httpStatus === 404 || httpStatus === 410) {
        return true;
    }

    const lowerDetails = details.toLowerCase();
    return (
        /\b404\b/.test(lowerDetails) ||
        lowerDetails.includes('not found') ||
        lowerDetails.includes('gone')
    );
}

export function isAccessDeniedStatus(
    httpStatus: number | undefined,
    details: string
): boolean {
    if (httpStatus === 401 || httpStatus === 403) {
        return true;
    }

    const lowerDetails = details.toLowerCase();
    return (
        /\b401\b/.test(lowerDetails) ||
        /\b403\b/.test(lowerDetails) ||
        lowerDetails.includes('forbidden') ||
        lowerDetails.includes('unauthorized')
    );
}

/**
 * Non-standard HTTP status codes used by IPTV/Xtream providers for blocking.
 * These are not part of the HTTP spec but are returned by many providers.
 */
const IPTV_PROVIDER_BLOCK_STATUS_CODES = new Set([
    451, // Unavailable for legal reasons (sometimes used by providers)
    458, // Common Xtream provider IP blocking code
    551, // Common Xtream provider account/content blocking code
    552, // Provider-specific blocking
    553, // Provider-specific blocking
]);

export function isStreamUnavailableStatus(
    httpStatus: number | undefined,
    details: string
): boolean {
    if (httpStatus !== undefined) {
        if (httpStatus >= 500 && httpStatus < 600) {
            return true;
        }
        if (IPTV_PROVIDER_BLOCK_STATUS_CODES.has(httpStatus)) {
            return true;
        }
    }

    const lowerDetails = details.toLowerCase();
    return (
        lowerDetails.includes('timeout') ||
        lowerDetails.includes('timed out') ||
        lowerDetails.includes('etimedout') ||
        lowerDetails.includes('gateway timeout') ||
        lowerDetails.includes('service unavailable') ||
        lowerDetails.includes('bad gateway') ||
        lowerDetails.includes('internal server error') ||
        lowerDetails.includes('stream server responded with status') ||
        /\b500\b/.test(lowerDetails) ||
        /\b502\b/.test(lowerDetails) ||
        /\b503\b/.test(lowerDetails) ||
        /\b504\b/.test(lowerDetails) ||
        /\b458\b/.test(lowerDetails) ||
        /\b551\b/.test(lowerDetails)
    );
}

function extractHttpStatusFromPayload(payload: unknown): number | undefined {
    if (!payload || typeof payload !== 'object') {
        return undefined;
    }

    const record = payload as Record<string, unknown>;
    const directStatus = readHttpStatusCode(record.code ?? record.status);
    if (directStatus !== undefined) {
        return directStatus;
    }

    if (record.response && typeof record.response === 'object') {
        return extractHttpStatusFromPayload(record.response);
    }

    return undefined;
}

function extractHttpStatusFromText(text: string): number | undefined {
    const statusFieldMatch = text.match(/"(?:status|code)"\s*:\s*(\d{3})/i);
    if (statusFieldMatch) {
        return readHttpStatusCode(Number(statusFieldMatch[1]));
    }

    const httpStatusMatch = text.match(/\bHTTP\s+(\d{3})\b/i);
    if (httpStatusMatch) {
        return readHttpStatusCode(Number(httpStatusMatch[1]));
    }

    return undefined;
}

function readHttpStatusCode(value: unknown): number | undefined {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
        return undefined;
    }

    return value >= 100 && value < 600 ? value : undefined;
}

export function isBrowserAccessFailure(details: string): boolean {
    return (
        details.includes('cors') ||
        details.includes('cross-origin') ||
        details.includes('cross origin') ||
        details.includes('access-control') ||
        details.includes('access control') ||
        details.includes('content security policy') ||
        details.includes('mixed content') ||
        details.includes('private network access') ||
        details.includes('blocked by content security') ||
        details.includes('blocked by cors') ||
        details.includes('blocked by mixed content') ||
        details.includes('not allowed to load local resource') ||
        details.includes('err_blocked') ||
        details.includes('err_cleartext')
    );
}

export function isEarlyEofFailure(details: string): boolean {
    const compactDetails = details.replace(/[^a-z0-9]/g, '');
    return compactDetails.includes('earlyeof');
}

export function isCodecFailure(details: string): boolean {
    return (
        details.includes('codec') ||
        details.includes('incompatiblecodecs') ||
        details.includes('addcodec')
    );
}

export function isDrmOrEncryptionFailure(details: string): boolean {
    return (
        details.includes('decrypt') ||
        details.includes('keysystem') ||
        details.includes('keyload') ||
        details.includes('license') ||
        details.includes('drm')
    );
}

function normalizeErrorPayload(payload: unknown): string {
    if (!payload) {
        return '';
    }

    if (typeof payload === 'string') {
        return payload;
    }

    if (payload instanceof Error) {
        const extraDetails = stringifyUnknown(payload);
        return [payload.message, extraDetails === '{}' ? '' : extraDetails]
            .filter(Boolean)
            .join(' ');
    }

    return stringifyUnknown(payload);
}

function stringifyUnknown(value: unknown): string {
    try {
        return JSON.stringify(value) || '';
    } catch {
        return String(value);
    }
}
