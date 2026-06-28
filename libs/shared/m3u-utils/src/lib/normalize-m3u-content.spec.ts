import {
    describeInvalidM3uContent,
    normalizeM3uContent,
    parseM3uPlaylistContent,
} from './normalize-m3u-content';

describe('normalizeM3uContent', () => {
    it('strips a UTF-8 BOM and leading whitespace before #EXTM3U', () => {
        expect(
            normalizeM3uContent(
                '\uFEFF\n  #EXTM3U\n#EXTINF:-1,Channel\nhttp://example.com/stream.m3u8'
            )
        ).toBe('#EXTM3U\n#EXTINF:-1,Channel\nhttp://example.com/stream.m3u8');
    });

    it('coerces Buffer responses to UTF-8 strings', () => {
        const buffer = Buffer.from(
            '#EXTM3U\n#EXTINF:-1,Channel\nhttp://example.com/stream.m3u8',
            'utf8'
        );

        expect(normalizeM3uContent(buffer)).toBe(
            '#EXTM3U\n#EXTINF:-1,Channel\nhttp://example.com/stream.m3u8'
        );
    });
});

describe('describeInvalidM3uContent', () => {
    it('detects HTML error pages', () => {
        expect(
            describeInvalidM3uContent(
                '<!DOCTYPE html><html><body>Login</body></html>'
            )
        ).toContain('returned HTML instead of an M3U file');
    });

    it('detects missing EXTM3U headers', () => {
        expect(describeInvalidM3uContent('not a playlist')).toContain(
            'missing #EXTM3U header'
        );
    });
});

describe('parseM3uPlaylistContent', () => {
    it('normalizes content before parsing', () => {
        const parsed = parseM3uPlaylistContent(
            '\uFEFF\n  #EXTM3U\n#EXTINF:-1,Channel\nhttp://example.com/stream.m3u8',
            (content) => content.startsWith('#EXTM3U')
        );

        expect(parsed).toBe(true);
    });

    it('throws a descriptive error for invalid playlist content', () => {
        expect(() =>
            parseM3uPlaylistContent('<html>login</html>', () => {
                throw new Error('Playlist is not valid');
            })
        ).toThrow('returned HTML instead of an M3U file');
    });
});
