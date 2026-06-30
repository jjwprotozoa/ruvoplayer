import {
    HttpClientTestingModule,
    HttpTestingController,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { SettingsAboutSectionComponent } from './settings-about-section.component';

describe('SettingsAboutSectionComponent', () => {
    let fixture: ComponentFixture<SettingsAboutSectionComponent>;
    let httpMock: HttpTestingController;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                SettingsAboutSectionComponent,
                TranslateModule.forRoot(),
                HttpClientTestingModule,
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(SettingsAboutSectionComponent);
        httpMock = TestBed.inject(HttpTestingController);
        fixture.componentRef.setInput('activeSection', 'about');
        fixture.componentRef.setInput(
            'desktopReleasesUrl',
            'https://github.com/jjwprotozoa/ruvoplayer/releases/latest'
        );
        fixture.componentRef.setInput(
            'githubProjectUrl',
            'https://github.com/jjwprotozoa/ruvoplayer'
        );
    });

    afterEach(() => {
        httpMock.verify();
    });

    function flushReleaseAssets(
        primaryAssets: Array<{
            name: string;
            browser_download_url: string;
            size: number;
        }>,
        fallbackAssets: Array<{
            name: string;
            browser_download_url: string;
            size: number;
        }> = []
    ): void {
        const primaryRequest = httpMock.expectOne(
            'https://api.github.com/repos/jjwprotozoa/ruvoplayer/releases/latest'
        );
        primaryRequest.flush({ assets: primaryAssets });

        if (fallbackAssets.length > 0) {
            const fallbackRequest = httpMock.expectOne(
                'https://api.github.com/repos/4gray/iptvnator/releases/latest'
            );
            fallbackRequest.flush({ assets: fallbackAssets });
        }

        fixture.detectChanges();
    }

    it('shows static desktop download cards immediately in PWA mode', () => {
        fixture.componentRef.setInput('isPwa', true);
        fixture.componentRef.setInput('isDesktop', false);
        fixture.detectChanges();

        expect(
            fixture.nativeElement.querySelector(
                '[data-test-id="link-desktop-download-mac-static"]'
            )
        ).toBeTruthy();
        expect(
            fixture.nativeElement.querySelector(
                '[data-test-id="link-desktop-download-windows-static"]'
            )
        ).toBeTruthy();
        expect(
            fixture.nativeElement.querySelector(
                '[data-test-id="link-desktop-download-linux-static"]'
            )
        ).toBeTruthy();
        expect(
            fixture.nativeElement.querySelector(
                '[data-test-id="link-desktop-download-mobile-web"]'
            )
        ).toBeTruthy();

        flushReleaseAssets(
            [
                {
                    name: 'RuvoPlayer-0.22.0-mac-arm64.dmg',
                    browser_download_url:
                        'https://github.com/jjwprotozoa/ruvoplayer/releases/download/v0.22.0/RuvoPlayer-0.22.0-mac-arm64.dmg',
                    size: 150_930_186,
                },
            ],
            [
                {
                    name: 'iptvnator-0.21.0-windows-x64-setup.exe',
                    browser_download_url:
                        'https://github.com/4gray/iptvnator/releases/download/v0.21.0/iptvnator-0.21.0-windows-x64-setup.exe',
                    size: 95_000_000,
                },
            ]
        );

        const macLink = fixture.nativeElement.querySelector(
            '[data-test-id="link-desktop-download-mac-arm64"]'
        ) as HTMLAnchorElement | null;
        const windowsLink = fixture.nativeElement.querySelector(
            '[data-test-id="link-desktop-download-windows"]'
        ) as HTMLAnchorElement | null;

        expect(macLink).toBeTruthy();
        expect(macLink?.textContent).toContain('macOS (Apple Silicon)');
        expect(windowsLink).toBeTruthy();
        expect(windowsLink?.textContent).toContain('Windows');
        expect(windowsLink?.textContent).toContain('IPTVnator upstream');
    });

    it('keeps static desktop cards when release assets are unavailable', () => {
        fixture.componentRef.setInput('isPwa', true);
        fixture.componentRef.setInput('isDesktop', false);
        fixture.detectChanges();

        const primaryRequest = httpMock.expectOne(
            'https://api.github.com/repos/jjwprotozoa/ruvoplayer/releases/latest'
        );
        primaryRequest.flush('', { status: 500, statusText: 'Server Error' });
        const fallbackRequest = httpMock.expectOne(
            'https://api.github.com/repos/4gray/iptvnator/releases/latest'
        );
        fallbackRequest.flush('', { status: 500, statusText: 'Server Error' });
        fixture.detectChanges();

        expect(
            fixture.nativeElement.querySelector(
                '[data-test-id="link-desktop-download-windows-static"]'
            )
        ).toBeTruthy();
        expect(
            fixture.nativeElement.querySelector(
                '[data-test-id="link-desktop-download-mobile-web"]'
            )
        ).toBeTruthy();
    });

    it('hides the desktop download card in Electron mode', () => {
        fixture.componentRef.setInput('isPwa', false);
        fixture.componentRef.setInput('isDesktop', true);
        fixture.detectChanges();

        expect(
            fixture.nativeElement.querySelector(
                '[data-test-id="link-desktop-download-mac-static"]'
            )
        ).toBeNull();
        expect(
            fixture.nativeElement.querySelector(
                '[data-test-id="link-desktop-download-mobile-web"]'
            )
        ).toBeNull();
    });

    it('uses the configured GitHub project URL', () => {
        fixture.componentRef.setInput('isPwa', false);
        fixture.componentRef.setInput('isDesktop', false);
        fixture.detectChanges();

        const link = fixture.nativeElement.querySelector(
            '[data-test-id="link-github"]'
        ) as HTMLAnchorElement | null;

        expect(link?.href).toContain('https://github.com/jjwprotozoa/ruvoplayer');
    });
});
