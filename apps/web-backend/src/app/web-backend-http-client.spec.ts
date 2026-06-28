import { AxiosError } from 'axios';
import {
    extractPlaylistFetchError,
    isInsecureTlsAllowed,
} from './web-backend-http-client';

describe('web-backend-http-client', () => {
    const insecureTlsEnv = 'IPTVNATOR_ALLOW_INSECURE_TLS';
    const originalEnv = process.env[insecureTlsEnv];

    afterEach(() => {
        if (originalEnv === undefined) {
            delete process.env[insecureTlsEnv];
        } else {
            process.env[insecureTlsEnv] = originalEnv;
        }
    });

    it('allows insecure TLS only when explicitly enabled', () => {
        delete process.env[insecureTlsEnv];
        expect(isInsecureTlsAllowed()).toBe(false);

        process.env[insecureTlsEnv] = '1';
        expect(isInsecureTlsAllowed()).toBe(true);
    });

    it('maps TLS failures to a readable playlist fetch error', () => {
        const error = new AxiosError(
            'self signed certificate',
            'DEPTH_ZERO_SELF_SIGNED_CERT'
        );

        expect(extractPlaylistFetchError(error)).toEqual({
            message:
                'TLS certificate validation failed for the playlist provider. The server may use a self-signed or expired certificate.',
            status: 502,
        });
    });

    it('maps HTTP provider failures to their status code', () => {
        const error = new AxiosError(
            'Request failed with status code 403',
            '403',
            undefined,
            undefined,
            {
                data: 'Forbidden',
                status: 403,
                statusText: 'Forbidden',
                headers: {},
                config: {} as never,
            }
        );

        expect(extractPlaylistFetchError(error)).toEqual({
            message: 'Forbidden',
            status: 403,
        });
    });
});
