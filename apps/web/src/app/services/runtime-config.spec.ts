import {
    getRuntimeBackendUrls,
    resolveBackendUrl,
    shouldEnableServiceWorker,
} from './runtime-config';

describe('runtime config helpers', () => {
    it('uses runtime BACKEND_URL when provided', () => {
        expect(
            resolveBackendUrl(
                { BACKEND_URL: '  http://self-hosted.local/api  ' },
                'https://fallback.example'
            )
        ).toBe('http://self-hosted.local/api');
    });

    it('falls back to the build-time backend URL when runtime config is missing or blank', () => {
        expect(resolveBackendUrl(undefined, 'https://fallback.example')).toBe(
            'https://fallback.example'
        );
        expect(resolveBackendUrl({}, 'https://fallback.example')).toBe(
            'https://fallback.example'
        );
        expect(
            resolveBackendUrl(
                { BACKEND_URL: '   ' },
                'https://fallback.example'
            )
        ).toBe('https://fallback.example');
    });

    it('collects primary and backup backend URLs without duplicates', () => {
        const originalConfig = globalThis.window?.__IPTVNATOR_CONFIG__;
        globalThis.window = {
            ...globalThis.window,
            __IPTVNATOR_CONFIG__: {
                BACKEND_URL: 'https://primary.example',
                BACKEND_URL_BACKUP: 'https://backup.example',
            },
        } as Window & typeof globalThis;

        expect(getRuntimeBackendUrls()).toEqual([
            'https://primary.example',
            'https://backup.example',
        ]);

        globalThis.window = {
            ...globalThis.window,
            __IPTVNATOR_CONFIG__: originalConfig,
        } as Window & typeof globalThis;
    });

        expect(
            shouldEnableServiceWorker(true, {
                serviceWorker: {},
            } as Navigator)
        ).toBe(true);
        expect(
            shouldEnableServiceWorker(false, { serviceWorker: {} } as Navigator)
        ).toBe(false);
        expect(shouldEnableServiceWorker(true, {} as Navigator)).toBe(false);
    });

    it('disables service worker for Electron runtime', () => {
        expect(
            shouldEnableServiceWorker(
                true,
                { serviceWorker: {} } as Navigator,
                {
                    electronBridge: {},
                    protocol: 'file:',
                }
            )
        ).toBe(false);
    });

    it('disables service worker for Electron runtime on non-file origins', () => {
        expect(
            shouldEnableServiceWorker(
                true,
                { serviceWorker: {} } as Navigator,
                {
                    electronBridge: {},
                    protocol: 'https:',
                }
            )
        ).toBe(false);
    });

    it('disables service worker for file origins without an Electron bridge', () => {
        expect(
            shouldEnableServiceWorker(
                true,
                { serviceWorker: {} } as Navigator,
                {
                    protocol: 'file:',
                }
            )
        ).toBe(false);
    });
});
