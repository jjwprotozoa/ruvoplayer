import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { SettingsAboutSectionComponent } from './settings-about-section.component';

describe('SettingsAboutSectionComponent', () => {
    let fixture: ComponentFixture<SettingsAboutSectionComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SettingsAboutSectionComponent, TranslateModule.forRoot()],
        }).compileComponents();

        fixture = TestBed.createComponent(SettingsAboutSectionComponent);
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

    it('shows the desktop download card in PWA mode', () => {
        fixture.componentRef.setInput('isPwa', true);
        fixture.componentRef.setInput('isDesktop', false);
        fixture.detectChanges();

        const link = fixture.nativeElement.querySelector(
            '[data-test-id="link-desktop-download"]'
        ) as HTMLAnchorElement | null;

        expect(link).toBeTruthy();
        expect(link?.href).toContain(
            'github.com/jjwprotozoa/ruvoplayer/releases/latest'
        );
    });

    it('hides the desktop download card in Electron mode', () => {
        fixture.componentRef.setInput('isPwa', false);
        fixture.componentRef.setInput('isDesktop', true);
        fixture.detectChanges();

        expect(
            fixture.nativeElement.querySelector(
                '[data-test-id="link-desktop-download"]'
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
