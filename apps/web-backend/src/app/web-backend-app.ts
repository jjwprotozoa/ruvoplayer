import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import zlib from 'node:zlib';
import epgParser from 'epg-parser';
import parser from 'iptv-playlist-parser';
import { normalizeXtreamServerUrl } from '@iptvnator/shared/interfaces';
import {
    createDefaultHttpClient,
    extractPlaylistFetchError,
    type WebBackendHttpClient,
    type WebBackendHttpGetOptions,
} from './web-backend-http-client';
import {
    describeInvalidM3uContent,
    normalizeM3uContent,
} from '@iptvnator/shared/m3u-utils';

export type { WebBackendHttpClient, WebBackendHttpGetOptions };

interface ProviderError extends Error {
    readonly response?: {
        readonly status?: number;
        readonly statusText?: string;
    };
}

interface PlaylistParseError {
    readonly message: string;
    readonly status: number;
}

export interface WebBackendAppOptions {
    readonly allowPrivateNetworkTargets?: boolean;
    readonly clientOrigins?: string[];
    readonly guid?: () => string;
    readonly httpClient?: WebBackendHttpClient;
    readonly now?: () => Date;
    readonly resolveHostname?: (hostname: string) => Promise<readonly string[]>;
    readonly runtimeBackendUrl?: string;
}

interface ProviderUrlPolicy {
    readonly allowPrivateNetworkTargets: boolean;
    readonly resolveHostname: (hostname: string) => Promise<readonly string[]>;
}

interface ProviderUrlError {
    readonly message: string;
    readonly status: number;
}

export function createWebBackendApp(
    options: WebBackendAppOptions = {}
): Express {
    const app = express();
    const httpClient = (options.httpClient ??
        createDefaultHttpClient()) as WebBackendHttpClient;
    const guid = options.guid ?? createGuid;
    const now = options.now ?? (() => new Date());
    const clientOrigins = options.clientOrigins ?? getClientOrigins();
    const runtimeBackendUrl =
        options.runtimeBackendUrl ?? process.env['BACKEND_URL'] ?? '/api';
    const providerUrlPolicy: ProviderUrlPolicy = {
        allowPrivateNetworkTargets:
            options.allowPrivateNetworkTargets ??
            isPrivateNetworkProxyAllowed(),
        resolveHostname: options.resolveHostname ?? resolveHostname,
    };
    const corsMiddleware = cors({
        origin(origin, callback) {
            if (
                !origin ||
                clientOrigins.includes('*') ||
                clientOrigins.includes(origin)
            ) {
                callback(null, true);
                return;
            }
            callback(null, false);
        },
        optionsSuccessStatus: 200,
    });

    app.get('/', (_req, res) => res.send('IPTVnator web backend'));
    app.get('/health', (_req, res) =>
        res.json({ status: 'ok', service: 'iptvnator-web-backend' })
    );

    app.get('/config.js', corsMiddleware, (_req, res) => {
        const config = JSON.stringify({ BACKEND_URL: runtimeBackendUrl });
        res.type('application/javascript').send(
            `window.__IPTVNATOR_CONFIG__ = Object.assign({}, window.__IPTVNATOR_CONFIG__, ${config});\n`
        );
    });

    app.options('/provider-targets', corsMiddleware);
    app.post(
        '/provider-targets',
        corsMiddleware,
        express.json({ limit: '16kb' }),
        async (req, res) => {
            const rawUrl =
                req.body &&
                typeof req.body === 'object' &&
                'url' in req.body &&
                typeof req.body.url === 'string'
                    ? req.body.url
                    : undefined;

            if (!rawUrl) {
                res.status(400).json({ message: 'Missing url', status: 400 });
                return;
            }

            const result = await validateProviderUrl(rawUrl, providerUrlPolicy);
            if ('message' in result) {
                res.status(result.status).json(result);
                return;
            }

            const targetId = createProviderTargetId(result);
            res.json({ targetId });
        }
    );

    app.get('/parse', corsMiddleware, async (req, res) => {
        const url = await getRegisteredProviderUrl(req, res, providerUrlPolicy);
        if (!url) {
            return;
        }

        const result = await handlePlaylistParse({
            guid,
            httpClient,
            now,
            url: url.href,
        });

        if (isPlaylistParseError(result)) {
            console.error('[web-backend] Playlist parse failed:', result);
            res.status(result.status).json(result);
            return;
        }

        res.json(result);
    });

    app.get('/parse-xml', corsMiddleware, async (req, res) => {
        const url = await getRegisteredProviderUrl(req, res, providerUrlPolicy);
        if (!url) {
            return;
        }

        try {
            const result = await fetchEpgDataFromUrl(httpClient, url);
            if (!result) {
                res.status(500).json({
                    message: 'Error, something went wrong',
                    status: 500,
                });
                return;
            }

            res.json(result);
        } catch (error) {
            const providerError = normalizeProviderError(error);
            res.status(providerError.status).json(providerError);
        }
    });

    app.get('/xtream', corsMiddleware, async (req, res) => {
        const registeredUrl = await getRegisteredProviderUrl(
            req,
            res,
            providerUrlPolicy
        );
        if (!registeredUrl) {
            return;
        }
        const url = new URL(registeredUrl.href);

        try {
            const providerUrlError = await normalizeAndValidateXtreamProviderUrl(
                url,
                providerUrlPolicy
            );
            if (providerUrlError) {
                res.status(providerUrlError.status).json(providerUrlError);
                return;
            }

            // Provider URLs are validated by /provider-targets before they enter the registry.
            // codeql[js/request-forgery]
            const response = await httpClient.get(
                appendPathSegment(url, 'player_api.php'),
                {
                    params: getProxyParams(req, ['targetId']),
                }
            );

            res.json({
                action: getQueryString(req, 'action'),
                payload: response.data,
            });
        } catch (error) {
            res.json(normalizeProviderError(error));
        }
    });

    app.get('/stalker', corsMiddleware, async (req, res) => {
        const url = await getRegisteredProviderUrl(req, res, providerUrlPolicy);
        const macAddress = getQueryString(req, 'macAddress');
        const token = getQueryString(req, 'token');
        if (!url) {
            return;
        }

        try {
            // Provider URLs are validated by /provider-targets before they enter the registry.
            // codeql[js/request-forgery]
            const response = await httpClient.get(url.href, {
                params: getProxyParams(req, ['targetId']),
                headers: {
                    ...(macAddress ? { Cookie: `mac=${macAddress}` } : {}),
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            res.json({
                action: getQueryString(req, 'action'),
                payload: response.data,
            });
        } catch (error) {
            res.json(normalizeProviderError(error));
        }
    });

    return app;
}

async function getRegisteredProviderUrl(
    req: Request,
    res: Response,
    policy: ProviderUrlPolicy
): Promise<URL | null> {
    const targetId = getQueryString(req, 'targetId');
    if (!targetId) {
        res.status(400).json({ message: 'Missing targetId', status: 400 });
        return null;
    }

    const result = await resolveProviderTargetId(targetId, policy);
    if ('message' in result) {
        res.status(result.status).json(result);
        return null;
    }

    return result;
}

async function validateProviderUrl(
    rawUrl: string,
    policy: ProviderUrlPolicy
): Promise<URL | ProviderUrlError> {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        return { message: 'Provider URL is not a valid URL', status: 400 };
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return {
            message: 'Only http and https provider URLs are supported',
            status: 400,
        };
    }

    if (url.username || url.password) {
        return {
            message: 'Provider URL credentials are not supported',
            status: 400,
        };
    }

    if (policy.allowPrivateNetworkTargets) {
        return url;
    }

    const hostname = normalizeHostname(url.hostname);
    if (isLocalHostname(hostname) || isPrivateOrReservedIp(hostname)) {
        return {
            message:
                'Provider URL points to a private or local network address',
            status: 400,
        };
    }

    if (isIP(hostname) === 0) {
        let addresses: readonly string[];
        try {
            addresses = await policy.resolveHostname(hostname);
        } catch {
            return {
                message: 'Provider URL host could not be resolved',
                status: 400,
            };
        }

        if (
            addresses.length === 0 ||
            addresses.some((address) =>
                isPrivateOrReservedIp(normalizeHostname(address))
            )
        ) {
            return {
                message:
                    'Provider URL points to a private or local network address',
                status: 400,
            };
        }
    }

    return url;
}

async function resolveHostname(hostname: string): Promise<readonly string[]> {
    const records = await lookup(hostname, { all: true, verbatim: true });
    return records.map((record) => record.address);
}

function createProviderTargetId(url: URL): string {
    return Buffer.from(url.href, 'utf8').toString('base64url');
}

async function resolveProviderTargetId(
    targetId: string,
    policy: ProviderUrlPolicy
): Promise<URL | ProviderUrlError> {
    let rawUrl: string;
    try {
        rawUrl = Buffer.from(targetId, 'base64url').toString('utf8');
    } catch {
        return { message: 'Provider target not found', status: 404 };
    }

    if (!/^https?:\/\//i.test(rawUrl)) {
        return { message: 'Provider target not found', status: 404 };
    }

    return validateProviderUrl(rawUrl, policy);
}

function isPrivateNetworkProxyAllowed(): boolean {
    const value = process.env['IPTVNATOR_PROXY_ALLOW_PRIVATE_NETWORKS'];
    return value === '1' || value === 'true';
}

function getClientOrigins(): string[] {
    const configured = process.env['CLIENT_URL']
        ?.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    if (configured?.length) {
        return configured;
    }

    return process.env['NODE_ENV'] === 'development' ||
        process.env['NODE_ENV'] === 'dev'
        ? ['http://localhost:4200']
        : ['https://iptvnator.vercel.app'];
}

function getQueryString(req: Request, key: string): string | undefined {
    const value = req.query[key];
    if (Array.isArray(value)) {
        return normalizeQueryValue(value[0]);
    }
    return normalizeQueryValue(value);
}

function normalizeQueryValue(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
}

function getProxyParams(
    req: Request,
    excludedKeys: string[]
): Record<string, string> {
    const excluded = new Set(excludedKeys);
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.query)) {
        if (excluded.has(key)) {
            continue;
        }
        const normalized = Array.isArray(value)
            ? normalizeQueryValue(value[0])
            : normalizeQueryValue(value);
        if (normalized) {
            params[key] = normalized;
        }
    }
    return params;
}

function appendPathSegment(url: URL, segment: string): string {
    const nextUrl = new URL(url.href);
    nextUrl.pathname = `${nextUrl.pathname.replace(/\/+$/, '')}/${segment}`;
    nextUrl.search = '';
    nextUrl.hash = '';
    return nextUrl.href;
}

async function normalizeAndValidateXtreamProviderUrl(
    url: URL,
    policy: ProviderUrlPolicy
): Promise<ProviderUrlError | null> {
    let normalizedUrl: URL;
    try {
        normalizedUrl = new URL(normalizeXtreamServerUrl(url.href));
    } catch {
        return { message: 'Provider URL is not a valid URL', status: 400 };
    }

    const validatedUrl = await validateProviderUrl(
        appendPathSegment(normalizedUrl, 'player_api.php'),
        policy
    );
    if ('message' in validatedUrl) {
        return validatedUrl;
    }

    url.href = normalizedUrl.href;
    return null;
}

async function handlePlaylistParse(options: {
    readonly guid: () => string;
    readonly httpClient: WebBackendHttpClient;
    readonly now: () => Date;
    readonly url: string;
}): Promise<Record<string, unknown> | PlaylistParseError> {
    try {
        // Provider URLs are validated by /provider-targets before playlist parsing.
        // codeql[js/request-forgery]
        const response = await options.httpClient.get<string>(options.url);
        const playlistContent = normalizeM3uContent(response.data);
        let parsedPlaylist: { items: Array<Record<string, unknown>> };
        try {
            parsedPlaylist = parsePlaylist(playlistContent);
        } catch (parseError) {
            if (
                parseError instanceof Error &&
                parseError.message === 'Playlist is not valid'
            ) {
                return {
                    message: describeInvalidM3uContent(playlistContent),
                    status: 422,
                };
            }

            throw parseError;
        }

        const title = getLastUrlSegment(options.url);
        return createPlaylistObject({
            guid: options.guid,
            now: options.now,
            playlist: parsedPlaylist,
            title,
            url: options.url,
        });
    } catch (error) {
        return extractPlaylistFetchError(error);
    }
}

async function fetchEpgDataFromUrl(
    httpClient: WebBackendHttpClient,
    url: URL
): Promise<unknown> {
    const href = url.href;
    // Provider URLs are validated by /provider-targets before XMLTV parsing.
    // codeql[js/request-forgery]
    const response = await httpClient.get<ArrayBuffer | string>(href, {
        ...(url.pathname.endsWith('.gz')
            ? { responseType: 'arraybuffer' }
            : {}),
    });
    const xml = url.pathname.endsWith('.gz')
        ? zlib.gunzipSync(Buffer.from(response.data as ArrayBuffer)).toString()
        : response.data.toString();
    return epgParser.parse(xml);
}

function isPlaylistParseError(
    result: Record<string, unknown> | PlaylistParseError
): result is PlaylistParseError {
    return (
        typeof (result as PlaylistParseError).status === 'number' &&
        typeof (result as PlaylistParseError).message === 'string'
    );
}

function parsePlaylist(playlist: string): {
    items: Array<Record<string, unknown>>;
} {
    return parser.parse(playlist) as unknown as {
        items: Array<Record<string, unknown>>;
    };
}

function createPlaylistObject(options: {
    readonly guid: () => string;
    readonly now: () => Date;
    readonly playlist: { items: Array<Record<string, unknown>> };
    readonly title: string;
    readonly url: string;
}): Record<string, unknown> {
    const timestamp = options.now().toISOString();
    const id = options.guid();
    return {
        id,
        _id: id,
        filename: options.title,
        title: options.title,
        count: options.playlist.items.length,
        playlist: {
            ...options.playlist,
            items: options.playlist.items.map((item) => ({
                id: options.guid(),
                ...item,
            })),
        },
        importDate: timestamp,
        lastUsage: timestamp,
        favorites: [],
        autoRefresh: false,
        url: options.url,
    };
}

function getLastUrlSegment(value: string): string {
    const segment = value.slice(value.lastIndexOf('/') + 1).trim();
    return segment.length > 0 ? segment : 'Playlist without title';
}

function normalizeProviderError(error: unknown): {
    readonly message: string;
    readonly status: number;
} {
    return extractPlaylistFetchError(error);
}

function createGuid(): string {
    return Math.random().toString(36).slice(2);
}

function normalizeHostname(hostname: string): string {
    return hostname.trim().replace(/^\[/, '').replace(/\]$/, '').toLowerCase();
}

function isLocalHostname(hostname: string): boolean {
    return hostname === 'localhost' || hostname.endsWith('.localhost');
}

function isPrivateOrReservedIp(address: string): boolean {
    const version = isIP(address);
    if (version === 4) {
        return isPrivateOrReservedIpv4(address);
    }

    if (version === 6) {
        return isPrivateOrReservedIpv6(address);
    }

    return false;
}

function isPrivateOrReservedIpv4(address: string): boolean {
    const parts = address.split('.').map((part) => Number(part));
    if (
        parts.length !== 4 ||
        parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
    ) {
        return true;
    }

    const [first, second, third] = parts;
    return (
        first === 0 ||
        first === 10 ||
        first === 127 ||
        (first === 100 && second >= 64 && second <= 127) ||
        (first === 169 && second === 254) ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168) ||
        (first === 192 && second === 0) ||
        (first === 192 && second === 0 && third === 2) ||
        (first === 198 && (second === 18 || second === 19)) ||
        (first === 198 && second === 51 && third === 100) ||
        (first === 203 && second === 0 && third === 113) ||
        first >= 224
    );
}

function isPrivateOrReservedIpv6(address: string): boolean {
    const normalized = address.toLowerCase();
    if (
        normalized === '::' ||
        normalized === '::1' ||
        normalized.startsWith('fc') ||
        normalized.startsWith('fd') ||
        normalized.startsWith('fe80:')
    ) {
        return true;
    }

    const mappedIpv4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
    return mappedIpv4 ? isPrivateOrReservedIpv4(mappedIpv4) : false;
}
