import { HttpClient } from '@angular/common/http';
import {
    Component,
    DestroyRef,
    ViewEncapsulation,
    computed,
    effect,
    inject,
    input,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, map, of, switchMap } from 'rxjs';
import {
    getRuntimeDesktopReleasesFallbackRepo,
    getRuntimeGithubRepo,
} from '../services/runtime-config';
import {
    DesktopReleaseAssetView,
    GitHubReleaseAsset,
    buildGitHubLatestReleaseApiUrl,
    buildMobileWebAppDownload,
    buildStaticDesktopDownloadCards,
    mergeCommonDesktopReleaseAssets,
    pickCommonDesktopReleaseAssets,
} from './desktop-release-assets.util';

interface GitHubLatestReleaseResponse {
    readonly assets?: GitHubReleaseAsset[];
}

@Component({
    selector: 'app-settings-about-section',
    imports: [MatIconModule, TranslateModule],
    templateUrl: './settings-about-section.component.html',
    encapsulation: ViewEncapsulation.None,
    styles: [':host { display: contents; }'],
})
export class SettingsAboutSectionComponent {
    private readonly http = inject(HttpClient);
    private readonly destroyRef = inject(DestroyRef);

    readonly activeSection = input.required<string>();
    readonly isDesktop = input(false);
    readonly isPwa = input(false);
    readonly version = input<string | undefined>();
    readonly updateMessage = input<string | undefined>();
    readonly desktopReleasesUrl = input.required<string>();
    readonly githubProjectUrl = input.required<string>();

    readonly desktopDownloads = signal<DesktopReleaseAssetView[]>([]);
    readonly desktopDownloadsLoading = signal(false);
    readonly desktopDownloadsFailed = signal(false);
    readonly mobileWebAppDownload = computed(() =>
        buildMobileWebAppDownload(this.resolveMobileWebAppUrl())
    );
    readonly visibleDesktopDownloads = computed(() => {
        const loaded = this.desktopDownloads();
        const cards =
            loaded.length > 0
                ? loaded
                : buildStaticDesktopDownloadCards(this.desktopReleasesUrl());

        return [...cards, this.mobileWebAppDownload()];
    });

    private desktopDownloadsRequested = false;

    constructor() {
        effect(() => {
            if (this.isPwa()) {
                this.ensureDesktopDownloadsLoaded();
            }
        });

        this.destroyRef.onDestroy(() => {
            this.desktopDownloadsRequested = false;
        });
    }

    ensureDesktopDownloadsLoaded(): void {
        if (!this.isPwa() || this.desktopDownloadsRequested) {
            return;
        }

        this.desktopDownloadsRequested = true;
        this.desktopDownloadsLoading.set(true);
        this.desktopDownloadsFailed.set(false);

        const primaryRepo = getRuntimeGithubRepo();
        const fallbackRepo = getRuntimeDesktopReleasesFallbackRepo();

        this.http
            .get<GitHubLatestReleaseResponse>(
                buildGitHubLatestReleaseApiUrl(primaryRepo)
            )
            .pipe(
                switchMap((primaryRelease) => {
                    const primaryAssets = pickCommonDesktopReleaseAssets(
                        primaryRelease.assets ?? []
                    );

                    if (!fallbackRepo) {
                        return of(primaryAssets);
                    }

                    return this.http
                        .get<GitHubLatestReleaseResponse>(
                            buildGitHubLatestReleaseApiUrl(fallbackRepo)
                        )
                        .pipe(
                            map((fallbackRelease) =>
                                mergeCommonDesktopReleaseAssets(
                                    primaryAssets,
                                    pickCommonDesktopReleaseAssets(
                                        fallbackRelease.assets ?? []
                                    )
                                )
                            ),
                            catchError(() => of(primaryAssets))
                        );
                }),
                catchError(() => {
                    if (!fallbackRepo) {
                        return of([] as DesktopReleaseAssetView[]);
                    }

                    return this.http
                        .get<GitHubLatestReleaseResponse>(
                            buildGitHubLatestReleaseApiUrl(fallbackRepo)
                        )
                        .pipe(
                            map((fallbackRelease) =>
                                pickCommonDesktopReleaseAssets(
                                    fallbackRelease.assets ?? []
                                ).map((asset) => ({
                                    ...asset,
                                    isUpstreamFallback: true,
                                    sublabel: asset.sublabel.includes(
                                        'IPTVnator upstream'
                                    )
                                        ? asset.sublabel
                                        : `${asset.sublabel}${asset.sublabel ? ' · ' : ''}IPTVnator upstream`,
                                }))
                            ),
                            catchError(() => of([] as DesktopReleaseAssetView[]))
                        );
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (downloads) => {
                    this.desktopDownloads.set(downloads);
                    this.desktopDownloadsLoading.set(false);
                    this.desktopDownloadsFailed.set(downloads.length === 0);
                },
                error: () => {
                    this.desktopDownloadsFailed.set(true);
                    this.desktopDownloadsLoading.set(false);
                },
            });
    }

    private resolveMobileWebAppUrl(): string {
        const configuredOrigin = globalThis.window?.location?.origin?.trim();
        if (configuredOrigin && configuredOrigin !== 'null') {
            return configuredOrigin;
        }

        return 'https://ruvoplayer.vercel.app';
    }
}
