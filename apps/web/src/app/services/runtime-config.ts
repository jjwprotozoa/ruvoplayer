import { AppConfig } from '../../environments/environment';

export interface IptvnatorRuntimeConfig {
    readonly BACKEND_URL?: string;
    readonly BACKEND_URL_BACKUP?: string;
}

export function resolveBackendUrl(
    runtimeConfig: IptvnatorRuntimeConfig | undefined,
    fallbackUrl: string
): string {
    const runtimeUrl = runtimeConfig?.BACKEND_URL?.trim();
    return runtimeUrl || fallbackUrl;
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
