import {
    getRuntimeBackendUrls,
    getRuntimeDesktopReleasesUrl,
    getRuntimeGithubProjectUrl,
    getRuntimeGithubRepo,
    resolveBackendUrl,
    shouldEnableServiceWorker,
} from './runtime-config';

describe('runtime config helpers', () => {
    const windowRef = globalThis.window as Window & typeof globalThis;
    let originalConfig = windowRef.__IPTVNATOR_CONFIG__;

    afterEach(() => {
        if (originalConfig === undefined) {
            delete windowRef.__IPTVNATOR_CONFIG__;
        } else {
            windowRef.__IPTVNATOR_CONFIG__ = originalConfig;
        }
    });

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
        windowRef.__IPTVNATOR_CONFIG__ = {
            BACKEND_URL: 'https://primary.example',
            BACKEND_URL_BACKUP: 'https://backup.example',
        };

        expect(getRuntimeBackendUrls()).toEqual([
            'https://primary.example',
            'https://backup.example',
        ]);
    });

    it('resolves github repo and desktop release URLs from runtime config', () => {
        windowRef.__IPTVNATOR_CONFIG__ = {
            GITHUB_REPO: 'example/ruvoplayer',
            DESKTOP_RELEASES_URL:
                'https://example.com/ruvoplayer/releases/latest',
        };

        expect(getRuntimeGithubRepo()).toBe('example/ruvoplayer');
        expect(getRuntimeGithubProjectUrl()).toBe(
            'https://github.com/example/ruvoplayer'
        );
        expect(getRuntimeDesktopReleasesUrl()).toBe(
            'https://example.com/ruvoplayer/releases/latest'
        );
    });

    it('enables service worker in production when supported', () => {
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
