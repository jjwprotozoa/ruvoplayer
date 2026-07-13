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
    getRuntimeDesktopReleasesFallbackUrl,
    getRuntimeGithubRepo,
} from '../services/runtime-config';
import {
    DesktopReleaseAssetView,
    GitHubReleaseAsset,
    buildGitHubLatestReleaseApiUrl,
    buildMobileWebAppDownload,
    buildStaticDesktopDownloadCards,
    markUpstreamDesktopReleaseAssets,
    partitionCommonDesktopReleaseAssets,
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

    readonly desktopPrimaryDownloads = signal<DesktopReleaseAssetView[]>([]);
    readonly desktopUpstreamDownloads = signal<DesktopReleaseAssetView[]>([]);
    readonly desktopDownloadsLoaded = signal(false);
    readonly desktopDownloadsLoading = signal(false);
    readonly desktopDownloadsFailed = signal(false);
    readonly desktopUpstreamReleasesUrl = computed(
        () => getRuntimeDesktopReleasesFallbackUrl() ?? ''
    );
    readonly mobileWebAppDownload = computed(() =>
        buildMobileWebAppDownload(this.resolveMobileWebAppUrl())
    );
    readonly visiblePrimaryDownloads = computed(() => {
        if (!this.desktopDownloadsLoaded()) {
            return buildStaticDesktopDownloadCards(this.desktopReleasesUrl());
        }

        return this.desktopPrimaryDownloads();
    });
    readonly visibleUpstreamDownloads = computed(() =>
        this.desktopUpstreamDownloads()
    );

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
        this.desktopDownloadsLoaded.set(false);

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
                        return of(
                            partitionCommonDesktopReleaseAssets(primaryAssets, [])
                        );
                    }

                    return this.http
                        .get<GitHubLatestReleaseResponse>(
                            buildGitHubLatestReleaseApiUrl(fallbackRepo)
                        )
                        .pipe(
                            map((fallbackRelease) =>
                                partitionCommonDesktopReleaseAssets(
                                    primaryAssets,
                                    pickCommonDesktopReleaseAssets(
                                        fallbackRelease.assets ?? []
                                    )
                                )
                            ),
                            catchError(() =>
                                of(
                                    partitionCommonDesktopReleaseAssets(
                                        primaryAssets,
                                        []
                                    )
                                )
                            )
                        );
                }),
                catchError(() => {
                    if (!fallbackRepo) {
                        return of({
                            primary: [] as DesktopReleaseAssetView[],
                            upstream: [] as DesktopReleaseAssetView[],
                        });
                    }

                    return this.http
                        .get<GitHubLatestReleaseResponse>(
                            buildGitHubLatestReleaseApiUrl(fallbackRepo)
                        )
                        .pipe(
                            map((fallbackRelease) => ({
                                primary: [] as DesktopReleaseAssetView[],
                                upstream: markUpstreamDesktopReleaseAssets(
                                    pickCommonDesktopReleaseAssets(
                                        fallbackRelease.assets ?? []
                                    )
                                ),
                            })),
                            catchError(() =>
                                of({
                                    primary: [] as DesktopReleaseAssetView[],
                                    upstream: [] as DesktopReleaseAssetView[],
                                })
                            )
                        );
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: ({ primary, upstream }) => {
                    this.desktopPrimaryDownloads.set(primary);
                    this.desktopUpstreamDownloads.set(upstream);
                    this.desktopDownloadsLoaded.set(true);
                    this.desktopDownloadsLoading.set(false);
                    this.desktopDownloadsFailed.set(
                        primary.length === 0 && upstream.length === 0
                    );
                },
                error: () => {
                    this.desktopDownloadsFailed.set(true);
                    this.desktopDownloadsLoading.set(false);
                    this.desktopDownloadsLoaded.set(true);
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
