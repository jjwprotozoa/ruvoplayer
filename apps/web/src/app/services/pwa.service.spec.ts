import {
    HttpClientTestingModule,
    HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SwUpdate } from '@angular/service-worker';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY } from 'rxjs';
import {
    PLAYLIST_PARSE_BY_URL,
    PLAYLIST_UPDATE,
} from '@iptvnator/shared/interfaces';
import { PwaService } from './pwa.service';

describe('PwaService', () => {
    let http: HttpTestingController;
    let service: PwaService;

    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => undefined);

        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                PwaService,
                {
                    provide: MatSnackBar,
                    useValue: {
                        open: jest.fn(),
                    },
                },
                {
                    provide: Store,
                    useValue: {
                        dispatch: jest.fn(),
                    },
                },
                {
                    provide: SwUpdate,
                    useValue: {
                        versionUpdates: EMPTY,
                    },
                },
                {
                    provide: TranslateService,
                    useValue: {
                        instant: jest.fn((key: string) => key),
                    },
                },
            ],
        });

        http = TestBed.inject(HttpTestingController);
        service = TestBed.inject(PwaService);
    });

    afterEach(() => {
        http.verify();
        jest.restoreAllMocks();
    });

    it('ignores URL imports without a payload or URL instead of calling the backend', () => {
        service.sendIpcEvent(PLAYLIST_PARSE_BY_URL);
        service.sendIpcEvent(PLAYLIST_PARSE_BY_URL, {});

        expect(http.match(() => true)).toHaveLength(0);
    });

    it('ignores playlist refreshes without a payload, URL, or id instead of calling the backend', () => {
        service.sendIpcEvent(PLAYLIST_UPDATE);
        service.sendIpcEvent(PLAYLIST_UPDATE, { id: 'playlist-1' });
        service.sendIpcEvent(PLAYLIST_UPDATE, {
            url: 'https://example.test/playlist.m3u',
        });

        expect(http.match(() => true)).toHaveLength(0);
    });

    it('re-registers provider targets when a legacy SHA256 targetId is cached', async () => {
        const providerUrl = 'http://ruvoplay.org';
        const legacyTargetId =
            '5ded33190e7b5252ab32146170df145c13c03bfd899e072121c3a0e91d6aa721';
        const modernTargetId = 'aHR0cDovL3J1dm9wbGF5Lm9yZy8';
        const getProviderTargetId = (
            service as unknown as {
                getProviderTargetId: (
                    url: string,
                    backendUrl?: string
                ) => Promise<string>;
            }
        ).getProviderTargetId.bind(service);

        const firstRequest = getProviderTargetId(providerUrl);
        const firstRegistration = http.expectOne(
            'https://ruvoplayer-api.vercel.app/provider-targets'
        );
        firstRegistration.flush({ targetId: legacyTargetId });
        await expect(firstRequest).resolves.toBe(legacyTargetId);

        const secondRequest = getProviderTargetId(providerUrl);
        const secondRegistration = http.expectOne(
            'https://ruvoplayer-api.vercel.app/provider-targets'
        );
        secondRegistration.flush({ targetId: modernTargetId });
        await expect(secondRequest).resolves.toBe(modernTargetId);
    });
});
