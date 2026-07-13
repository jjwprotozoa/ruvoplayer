import {
    buildGitHubLatestReleaseApiUrl,
    buildStaticDesktopDownloadCards,
    describeDesktopReleaseAsset,
    mergeCommonDesktopReleaseAssets,
    partitionCommonDesktopReleaseAssets,
    pickCommonDesktopReleaseAssets,
} from './desktop-release-assets.util';

describe('desktop-release-assets.util', () => {
    it('builds the GitHub latest release API URL from the configured repo slug', () => {
        expect(buildGitHubLatestReleaseApiUrl('jjwprotozoa/ruvoplayer')).toBe(
            'https://api.github.com/repos/jjwprotozoa/ruvoplayer/releases/latest'
        );
    });

    it('builds static desktop cards that link to the releases page', () => {
        const cards = buildStaticDesktopDownloadCards(
            'https://github.com/jjwprotozoa/ruvoplayer/releases/latest'
        );

        expect(cards.map((card) => card.slotKey)).toEqual([
            'mac-static',
            'windows-quick-static',
            'windows-custom-static',
            'linux-static',
        ]);
        expect(cards.every((card) => card.href.includes('/releases/latest'))).toBe(
            true
        );
    });

    it('describes macOS, Windows, and Linux artifacts with readable labels', () => {
        expect(
            describeDesktopReleaseAsset({
                name: 'RuvoPlayer-0.22.0-mac-arm64.dmg',
                browser_download_url:
                    'https://github.com/jjwprotozoa/ruvoplayer/releases/download/v0.22.0/RuvoPlayer-0.22.0-mac-arm64.dmg',
                size: 150_930_186,
            })
        ).toEqual(
            expect.objectContaining({
                label: 'macOS (Apple Silicon)',
                sublabel: 'DMG · arm64 · 144 MB',
                platformKey: 'macos',
                icon: 'laptop_mac',
            })
        );

        expect(
            describeDesktopReleaseAsset({
                name: 'iptvnator-0.21.0-windows-x64-quick-setup.exe',
                browser_download_url:
                    'https://github.com/4gray/iptvnator/releases/download/v0.21.0/iptvnator-0.21.0-windows-x64-quick-setup.exe',
                size: 95_000_000,
            })
        ).toEqual(
            expect.objectContaining({
                label: 'Windows (Quick install)',
                sublabel: 'Quick install · x64 · 91 MB',
                platformKey: 'windows',
                icon: 'desktop_windows',
            })
        );

        expect(
            describeDesktopReleaseAsset({
                name: 'iptvnator-0.21.0-windows-x64-custom-setup.exe',
                browser_download_url:
                    'https://github.com/4gray/iptvnator/releases/download/v0.21.0/iptvnator-0.21.0-windows-x64-custom-setup.exe',
                size: 96_000_000,
            })
        ).toEqual(
            expect.objectContaining({
                label: 'Windows (Choose location)',
                sublabel: 'Choose location · x64 · 92 MB',
                platformKey: 'windows',
                icon: 'desktop_windows',
            })
        );

        expect(
            describeDesktopReleaseAsset({
                name: 'iptvnator-0.21.0-windows-x64-setup.exe',
                browser_download_url:
                    'https://github.com/4gray/iptvnator/releases/download/v0.21.0/iptvnator-0.21.0-windows-x64-setup.exe',
                size: 95_000_000,
            })
        ).toEqual(
            expect.objectContaining({
                label: 'Windows (Quick install)',
                sublabel: 'Quick install · x64 · 91 MB',
                platformKey: 'windows',
                icon: 'desktop_windows',
            })
        );

        expect(
            describeDesktopReleaseAsset({
                name: 'iptvnator-0.21.0-linux-x86_64.AppImage',
                browser_download_url:
                    'https://github.com/4gray/iptvnator/releases/download/v0.21.0/iptvnator-0.21.0-linux-x86_64.AppImage',
                size: 120_000_000,
            })
        ).toEqual(
            expect.objectContaining({
                label: 'Linux (AppImage)',
                sublabel: 'x64 · 114 MB',
                platformKey: 'linux',
                icon: 'computer',
            })
        );
    });

    it('picks only the most common desktop installers', () => {
        const assets = pickCommonDesktopReleaseAssets([
            {
                name: 'iptvnator-0.21.0-linux-amd64.deb',
                browser_download_url: 'https://example.com/linux-deb',
                size: 1,
            },
            {
                name: 'iptvnator-0.21.0-linux-x86_64.AppImage',
                browser_download_url: 'https://example.com/linux-appimage',
                size: 1,
            },
            {
                name: 'iptvnator-0.21.0-windows-ia32-setup.exe',
                browser_download_url: 'https://example.com/windows-ia32',
                size: 1,
            },
            {
                name: 'iptvnator-0.21.0-windows-x64-custom-setup.exe',
                browser_download_url: 'https://example.com/windows-custom',
                size: 1,
            },
            {
                name: 'iptvnator-0.21.0-windows-x64-quick-setup.exe',
                browser_download_url: 'https://example.com/windows-quick',
                size: 1,
            },
            {
                name: 'iptvnator-0.21.0-windows-x64-setup.exe',
                browser_download_url: 'https://example.com/windows-legacy',
                size: 1,
            },
            {
                name: 'iptvnator-0.21.0-mac-x64.dmg',
                browser_download_url: 'https://example.com/mac-intel',
                size: 1,
            },
            {
                name: 'iptvnator-0.21.0-mac-arm64.dmg',
                browser_download_url: 'https://example.com/mac-arm',
                size: 1,
            },
            {
                name: 'Source code (zip)',
                browser_download_url: 'https://example.com/source',
                size: 1,
            },
        ]);

        expect(assets.map((asset) => asset.slotKey)).toEqual([
            'mac-arm64',
            'mac-x64',
            'windows-quick',
            'windows-custom',
            'linux',
        ]);
        expect(
            assets.find((asset) => asset.slotKey === 'windows-quick')?.href
        ).toBe('https://example.com/windows-quick');
        expect(
            assets.find((asset) => asset.slotKey === 'windows-custom')?.href
        ).toBe('https://example.com/windows-custom');
        expect(assets.find((asset) => asset.slotKey === 'linux')?.href).toBe(
            'https://example.com/linux-appimage'
        );
    });

    it('fills missing common slots from upstream fallback assets', () => {
        const partitioned = partitionCommonDesktopReleaseAssets(
            pickCommonDesktopReleaseAssets([
                {
                    name: 'RuvoPlayer-0.22.0-mac-arm64.dmg',
                    browser_download_url: 'https://example.com/ruvo-mac',
                    size: 1,
                },
            ]),
            pickCommonDesktopReleaseAssets([
                {
                    name: 'iptvnator-0.21.0-windows-x64-setup.exe',
                    browser_download_url: 'https://example.com/windows',
                    size: 1,
                },
                {
                    name: 'iptvnator-0.21.0-linux-x86_64.AppImage',
                    browser_download_url: 'https://example.com/linux',
                    size: 1,
                },
            ])
        );

        expect(partitioned.primary.map((asset) => asset.slotKey)).toEqual([
            'mac-arm64',
        ]);
        expect(partitioned.upstream.map((asset) => asset.slotKey)).toEqual([
            'upstream-windows-quick',
            'upstream-linux',
        ]);
        expect(
            partitioned.upstream.find(
                (asset) => asset.slotKey === 'upstream-windows-quick'
            )
        ).toEqual(
            expect.objectContaining({
                isUpstreamFallback: true,
                sublabel: expect.stringContaining('IPTVnator upstream'),
            })
        );
    });

    it('keeps merge helper behavior for legacy callers', () => {
        const merged = mergeCommonDesktopReleaseAssets(
            pickCommonDesktopReleaseAssets([
                {
                    name: 'RuvoPlayer-0.22.0-mac-arm64.dmg',
                    browser_download_url: 'https://example.com/ruvo-mac',
                    size: 1,
                },
            ]),
            pickCommonDesktopReleaseAssets([
                {
                    name: 'iptvnator-0.21.0-windows-x64-setup.exe',
                    browser_download_url: 'https://example.com/windows',
                    size: 1,
                },
            ])
        );

        expect(merged.map((asset) => asset.slotKey)).toEqual([
            'mac-arm64',
            'upstream-windows-quick',
        ]);
    });
});
