import { AppConfig } from '../../environments/environment';

export interface IptvnatorRuntimeConfig {
    readonly BACKEND_URL?: string;
    readonly BACKEND_URL_BACKUP?: string;
    readonly GITHUB_REPO?: string;
    readonly DESKTOP_RELEASES_URL?: string;
    readonly DESKTOP_RELEASES_FALLBACK_REPO?: string;
}

function resolveRuntimeString(
    runtimeValue: string | undefined,
    fallbackValue: string
): string {
    const trimmed = runtimeValue?.trim();
    return trimmed || fallbackValue;
}

export function resolveBackendUrl(
    runtimeConfig: IptvnatorRuntimeConfig | undefined,
    fallbackUrl: string
): string {
    return resolveRuntimeString(runtimeConfig?.BACKEND_URL, fallbackUrl);
}

export function getRuntimeBackendUrls(): readonly string[] {
    const runtimeConfig = globalThis.window?.__IPTVNATOR_CONFIG__;
    const urls = [
        resolveBackendUrl(runtimeConfig, AppConfig.BACKEND_URL),
        runtimeConfig?.BACKEND_URL_BACKUP?.trim() ||
            AppConfig.BACKEND_URL_BACKUP?.trim(),
    ].filter((url): url is string => !!url && url.length > 0);

    return [...new Set(urls)];
}

export function getRuntimeBackendUrl(): string {
    return getRuntimeBackendUrls()[0];
}

export function getRuntimeGithubRepo(): string {
    const runtimeConfig = globalThis.window?.__IPTVNATOR_CONFIG__;
    return resolveRuntimeString(runtimeConfig?.GITHUB_REPO, AppConfig.GITHUB_REPO);
}

export function getRuntimeGithubProjectUrl(): string {
    return `https://github.com/${getRuntimeGithubRepo()}`;
}

export function getRuntimeDesktopReleasesUrl(): string {
    const runtimeConfig = globalThis.window?.__IPTVNATOR_CONFIG__;
    return resolveRuntimeString(
        runtimeConfig?.DESKTOP_RELEASES_URL,
        AppConfig.DESKTOP_RELEASES_URL
    );
}

export function getRuntimeDesktopReleasesFallbackRepo(): string | undefined {
    const runtimeConfig = globalThis.window?.__IPTVNATOR_CONFIG__;
    const configuredFallback = runtimeConfig?.DESKTOP_RELEASES_FALLBACK_REPO?.trim();
    if (configuredFallback) {
        return configuredFallback;
    }

    const primaryRepo = getRuntimeGithubRepo();
    return primaryRepo === '4gray/iptvnator' ? undefined : '4gray/iptvnator';
}

export interface ServiceWorkerRuntimeContext {
    readonly electronBridge?: unknown;
    readonly protocol?: string;
}

function getDefaultServiceWorkerRuntimeContext(): ServiceWorkerRuntimeContext {
    const browserWindow = globalThis.window as
        | (Window & { electron?: unknown })
        | undefined;

    return {
        electronBridge: browserWindow?.electron,
        protocol:
            browserWindow?.location?.protocol ?? globalThis.location?.protocol,
    };
}

export function shouldEnableServiceWorker(
    production = AppConfig.production,
    navigatorRef: Navigator | undefined = globalThis.navigator,
    runtimeContext = getDefaultServiceWorkerRuntimeContext()
): boolean {
    return (
        production &&
        !!navigatorRef &&
        'serviceWorker' in navigatorRef &&
        !runtimeContext.electronBridge &&
        runtimeContext.protocol !== 'file:'
    );
}
