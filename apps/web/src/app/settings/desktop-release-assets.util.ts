export interface GitHubReleaseAsset {
    readonly name: string;
    readonly browser_download_url: string;
    readonly size: number;
}

export type DesktopReleasePlatformKey =
    | 'macos'
    | 'windows'
    | 'linux'
    | 'android'
    | 'other';

export interface DesktopReleaseAssetView {
    readonly label: string;
    readonly sublabel: string;
    readonly href: string;
    readonly platformKey: DesktopReleasePlatformKey;
    readonly icon: string;
    readonly sortOrder: number;
    readonly slotKey: string;
    readonly fileName: string;
    readonly isUpstreamFallback?: boolean;
}

const PLATFORM_SORT_ORDER: Record<
    Exclude<DesktopReleasePlatformKey, 'android'>,
    number
> = {
    macos: 0,
    windows: 1,
    linux: 2,
    other: 3,
};

const COMMON_RELEASE_SLOTS = [
    {
        slotKey: 'mac-arm64',
        pick: (names: readonly string[]) =>
            names.find((name) => /-mac-arm64\.dmg$/i.test(name)),
    },
    {
        slotKey: 'mac-x64',
        pick: (names: readonly string[]) =>
            names.find((name) => /-mac-x64\.dmg$/i.test(name)),
    },
    {
        slotKey: 'windows-quick',
        pick: (names: readonly string[]) =>
            names.find(
                (name) =>
                    /-windows-x64-quick-setup\.exe$/i.test(name) &&
                    !/ia32/i.test(name)
            ) ??
            names.find(
                (name) =>
                    /-windows-setup\.exe$/i.test(name) &&
                    !/ia32/i.test(name) &&
                    !/custom-setup/i.test(name)
            ) ??
            names.find(
                (name) =>
                    /-windows-x64.*-setup\.exe$/i.test(name) &&
                    !/ia32/i.test(name) &&
                    !/custom-setup/i.test(name)
            ),
    },
    {
        slotKey: 'windows-custom',
        pick: (names: readonly string[]) =>
            names.find(
                (name) =>
                    /-windows-x64-custom-setup\.exe$/i.test(name) &&
                    !/ia32/i.test(name)
            ) ??
            names.find(
                (name) =>
                    /-windows-.*-custom-setup\.exe$/i.test(name) &&
                    !/ia32/i.test(name)
            ),
    },
    {
        slotKey: 'linux',
        pick: (names: readonly string[]) =>
            names.find((name) => /linux-x86_64\.AppImage$/i.test(name)) ??
            names.find((name) => /linux-x64\.AppImage$/i.test(name)) ??
            names.find((name) => /linux-amd64\.deb$/i.test(name)),
    },
] as const;

function formatFileSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '';
    }

    const megabytes = bytes / (1024 * 1024);
    if (megabytes >= 100) {
        return `${Math.round(megabytes)} MB`;
    }

    return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
}

function describeMacAsset(
    name: string
): Omit<DesktopReleaseAssetView, 'href' | 'sublabel' | 'slotKey' | 'fileName'> & {
    details: string[];
} {
    const isArm = /-arm64/i.test(name);
    const isIntel = /-x64/i.test(name) || /-mac-x86/i.test(name);

    return {
        label: isArm
            ? 'macOS (Apple Silicon)'
            : isIntel
              ? 'macOS (Intel)'
              : 'macOS',
        platformKey: 'macos',
        icon: 'laptop_mac',
        sortOrder:
            PLATFORM_SORT_ORDER.macos + (isArm ? 0 : isIntel ? 0.1 : 0.2),
        details: [
            name.endsWith('.dmg') ? 'DMG' : name.endsWith('.zip') ? 'ZIP' : '',
            isArm ? 'arm64' : isIntel ? 'x64' : '',
        ].filter(Boolean),
    };
}

function describeWindowsAsset(
    name: string
): Omit<DesktopReleaseAssetView, 'href' | 'sublabel' | 'slotKey' | 'fileName'> & {
    details: string[];
} {
    const isArm = /-arm64/i.test(name);
    const isX64 = /-x64/i.test(name) || /x86_64/i.test(name);
    const isCustom = /-custom-setup\.exe$/i.test(name);
    const isQuick =
        /-quick-setup\.exe$/i.test(name) ||
        (/-setup\.exe$/i.test(name) && !isCustom);
    const isGeneric =
        /-windows-setup\.exe$/i.test(name) && !isX64 && !/ia32/i.test(name);

    const installMode = isCustom
        ? 'Choose location'
        : isQuick || isGeneric
          ? 'Quick install'
          : 'Installer';

    return {
        label: isCustom ? 'Windows (Choose location)' : 'Windows (Quick install)',
        platformKey: 'windows',
        icon: 'desktop_windows',
        sortOrder:
            PLATFORM_SORT_ORDER.windows + (isCustom ? 0.05 : 0),
        details: [
            installMode,
            isArm ? 'arm64' : isX64 ? 'x64' : isGeneric ? '64-bit' : '',
        ].filter(Boolean),
    };
}

function describeLinuxAsset(
    name: string
): Omit<DesktopReleaseAssetView, 'href' | 'sublabel' | 'slotKey' | 'fileName'> & {
    details: string[];
} {
    const lowerName = name.toLowerCase();
    let format = 'Package';

    if (lowerName.endsWith('.appimage')) {
        format = 'AppImage';
    } else if (lowerName.endsWith('.deb')) {
        format = 'DEB';
    } else if (lowerName.endsWith('.rpm')) {
        format = 'RPM';
    } else if (lowerName.endsWith('.snap')) {
        format = 'Snap';
    } else if (lowerName.endsWith('.flatpak')) {
        format = 'Flatpak';
    } else if (lowerName.endsWith('.pacman')) {
        format = 'Pacman';
    }

    const isArm = /-arm64/i.test(name);
    const isX64 = /-x64/i.test(name) || /x86_64/i.test(name) || /amd64/i.test(name);

    return {
        label: `Linux (${format})`,
        platformKey: 'linux',
        icon: 'computer',
        sortOrder: PLATFORM_SORT_ORDER.linux,
        details: [isArm ? 'arm64' : isX64 ? 'x64' : ''].filter(Boolean),
    };
}

export function describeDesktopReleaseAsset(
    asset: GitHubReleaseAsset,
    options: {
        slotKey?: string;
        isUpstreamFallback?: boolean;
    } = {}
): DesktopReleaseAssetView {
    const name = asset.name;
    const lowerName = name.toLowerCase();
    const sizeLabel = formatFileSize(asset.size);

    let described: Omit<
        DesktopReleaseAssetView,
        'href' | 'sublabel' | 'slotKey' | 'fileName' | 'isUpstreamFallback'
    > & { details: string[] };

    if (/-mac-|\.dmg$/i.test(name) || /mac/i.test(lowerName)) {
        described = describeMacAsset(name);
    } else if (/windows|-win-/i.test(name) || /\.exe$|\.msi$/i.test(name)) {
        described = describeWindowsAsset(name);
    } else if (
        /\.appimage$|\.deb$|\.rpm$|\.snap$|\.flatpak$|\.pacman$/i.test(name) ||
        /-linux-/i.test(name)
    ) {
        described = describeLinuxAsset(name);
    } else {
        described = {
            label: name,
            platformKey: 'other',
            icon: 'download',
            sortOrder: PLATFORM_SORT_ORDER.other,
            details: [],
        };
    }

    const sublabelParts = [...described.details, sizeLabel];
    if (options.isUpstreamFallback) {
        sublabelParts.push('IPTVnator upstream');
    }

    return {
        label: described.label,
        sublabel: sublabelParts.filter(Boolean).join(' · '),
        href: asset.browser_download_url,
        platformKey: described.platformKey,
        icon: described.icon,
        sortOrder: described.sortOrder,
        slotKey: options.slotKey ?? described.platformKey,
        fileName: name,
        isUpstreamFallback: options.isUpstreamFallback,
    };
}

export function mapDesktopReleaseAssets(
    assets: readonly GitHubReleaseAsset[]
): DesktopReleaseAssetView[] {
    return assets
        .filter((asset) => asset.name && asset.browser_download_url)
        .map((asset) => describeDesktopReleaseAsset(asset))
        .sort((left, right) => {
            if (left.sortOrder !== right.sortOrder) {
                return left.sortOrder - right.sortOrder;
            }

            return left.label.localeCompare(right.label);
        });
}

function isInstallerAsset(name: string): boolean {
    return !/(source code|\.zip$|\.tar\.gz$)/i.test(name);
}

export function pickCommonDesktopReleaseAssets(
    assets: readonly GitHubReleaseAsset[]
): DesktopReleaseAssetView[] {
    const installableAssets = assets.filter(
        (asset) => asset.name && asset.browser_download_url && isInstallerAsset(asset.name)
    );
    const describedByName = new Map(
        installableAssets.map((asset) => [
            asset.name,
            describeDesktopReleaseAsset(asset),
        ])
    );
    const availableNames = [...describedByName.keys()];
    const usedNames = new Set<string>();
    const picked: DesktopReleaseAssetView[] = [];

    for (const slot of COMMON_RELEASE_SLOTS) {
        const fileName = slot.pick(
            availableNames.filter((name) => !usedNames.has(name))
        );

        if (!fileName) {
            continue;
        }

        usedNames.add(fileName);
        picked.push({
            ...describedByName.get(fileName)!,
            slotKey: slot.slotKey,
        });
    }

    return picked.sort((left, right) => left.sortOrder - right.sortOrder);
}

export function mergeCommonDesktopReleaseAssets(
    primary: readonly DesktopReleaseAssetView[],
    fallback: readonly DesktopReleaseAssetView[]
): DesktopReleaseAssetView[] {
    const merged = new Map(primary.map((asset) => [asset.slotKey, asset]));

    for (const asset of fallback) {
        if (!merged.has(asset.slotKey)) {
            merged.set(asset.slotKey, {
                ...asset,
                isUpstreamFallback: true,
                sublabel: asset.sublabel.includes('IPTVnator upstream')
                    ? asset.sublabel
                    : `${asset.sublabel}${asset.sublabel ? ' · ' : ''}IPTVnator upstream`,
            });
        }
    }

    return [...merged.values()].sort(
        (left, right) => left.sortOrder - right.sortOrder
    );
}

export function buildStaticDesktopDownloadCards(
    releasesUrl: string
): DesktopReleaseAssetView[] {
    return [
        {
            label: 'macOS',
            sublabel: 'Apple Silicon and Intel builds',
            href: releasesUrl,
            platformKey: 'macos',
            icon: 'laptop_mac',
            sortOrder: PLATFORM_SORT_ORDER.macos,
            slotKey: 'mac-static',
            fileName: '',
        },
        {
            label: 'Windows (Quick install)',
            sublabel: 'One-click installer',
            href: releasesUrl,
            platformKey: 'windows',
            icon: 'desktop_windows',
            sortOrder: PLATFORM_SORT_ORDER.windows,
            slotKey: 'windows-quick-static',
            fileName: '',
        },
        {
            label: 'Windows (Choose location)',
            sublabel: 'Installer wizard with custom folder',
            href: releasesUrl,
            platformKey: 'windows',
            icon: 'desktop_windows',
            sortOrder: PLATFORM_SORT_ORDER.windows + 0.05,
            slotKey: 'windows-custom-static',
            fileName: '',
        },
        {
            label: 'Linux',
            sublabel: 'AppImage, DEB, and other packages',
            href: releasesUrl,
            platformKey: 'linux',
            icon: 'computer',
            sortOrder: PLATFORM_SORT_ORDER.linux,
            slotKey: 'linux-static',
            fileName: '',
        },
    ];
}

export function buildGitHubLatestReleaseApiUrl(githubRepo: string): string {
    const normalizedRepo = githubRepo.trim().replace(/^\/+|\/+$/g, '');
    return `https://api.github.com/repos/${normalizedRepo}/releases/latest`;
}

export function buildMobileWebAppDownload(
    href: string
): DesktopReleaseAssetView {
    return {
        label: 'Android / mobile',
        sublabel: 'Install the web app in your browser',
        href,
        platformKey: 'android',
        icon: 'phone_android',
        sortOrder: 1.5,
        slotKey: 'mobile-web',
        fileName: 'mobile-web-app',
    };
}
