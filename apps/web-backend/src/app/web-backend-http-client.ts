import axios, { AxiosInstance, isAxiosError } from 'axios';
import { Agent as HttpsAgent } from 'node:https';

export interface WebBackendHttpGetOptions {
    readonly headers?: Record<string, string>;
    readonly params?: Record<string, string>;
    readonly responseType?: 'arraybuffer';
}

export interface WebBackendHttpClient {
    get<T>(
        url: string,
        options?: WebBackendHttpGetOptions
    ): Promise<{ data: T }>;
}

export interface PlaylistFetchError {
    readonly message: string;
    readonly status: number;
}

const INSECURE_TLS_ENV = 'IPTVNATOR_ALLOW_INSECURE_TLS';
const TLS_ERROR_CODES = new Set([
    'CERT_HAS_EXPIRED',
    'DEPTH_ZERO_SELF_SIGNED_CERT',
    'ERR_TLS_CERT_ALTNAME_INVALID',
    'SELF_SIGNED_CERT_IN_CHAIN',
    'UNABLE_TO_GET_ISSUER_CERT',
    'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
]);

export function isInsecureTlsAllowed(): boolean {
    const value = process.env[INSECURE_TLS_ENV]?.trim().toLowerCase();
    return value === '1' || value === 'true';
}

export function createDefaultHttpClient(): WebBackendHttpClient {
    const client: AxiosInstance = axios.create({
        headers: {
            Accept: '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            // A browser-like User-Agent maximizes compatibility with providers
            // that reject generic agents.
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        httpsAgent: new HttpsAgent({
            rejectUnauthorized: !isInsecureTlsAllowed(),
        }),
        maxRedirects: 5,
        timeout: 30_000,
        validateStatus: (status) => status >= 200 && status < 300,
    });

    return client;
}

export function extractPlaylistFetchError(error: unknown): PlaylistFetchError {
    if (isAxiosError(error)) {
        if (error.response) {
            const responseMessage =
                typeof error.response.data === 'string' &&
                error.response.data.trim().length > 0
                    ? error.response.data.trim().slice(0, 240)
                    : error.response.statusText;

            return {
                message: responseMessage || `HTTP ${error.response.status}`,
                status: error.response.status,
            };
        }

        if (error.code && TLS_ERROR_CODES.has(error.code)) {
            return {
                message:
                    'TLS certificate validation failed for the playlist provider. The server may use a self-signed or expired certificate.',
                status: 502,
            };
        }

        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            return {
                message: error.message || 'Could not reach the playlist URL',
                status: 502,
            };
        }

        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            return {
                message: 'Timed out while fetching the playlist URL',
                status: 504,
            };
        }

        return {
            message: error.message || 'Failed to fetch playlist URL',
            status: 502,
        };
    }

    const response = getErrorResponse(error);
    if (response) {
        return {
            message: response.statusText || `HTTP ${response.status}`,
            status: response.status,
        };
    }

    if (error instanceof Error) {
        return {
            message: error.message || 'Failed to parse playlist',
            status: 500,
        };
    }

    return {
        message: 'Error, something went wrong',
        status: 500,
    };
}

function getErrorResponse(
    error: unknown
): { readonly status: number; readonly statusText?: string } | null {
    if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'status' in error.response &&
        typeof error.response.status === 'number'
    ) {
        const statusText =
            'statusText' in error.response &&
            typeof error.response.statusText === 'string'
                ? error.response.statusText
                : undefined;

        return {
            status: error.response.status,
            statusText,
        };
    }

    return null;
}
