export function normalizeM3uContent(raw: unknown): string {
    let content = coerceToUtf8String(raw);
    content = content.replace(/^\uFEFF/, '').replace(/^\s+/, '');

    const extm3uIndex = content.indexOf('#EXTM3U');
    if (extm3uIndex > 0) {
        content = content.slice(extm3uIndex);
    }

    return content;
}

export function describeInvalidM3uContent(content: string): string {
    const sample = content.replace(/^\s+/, '').slice(0, 120).toLowerCase();

    if (sample.startsWith('<!doctype html') || sample.startsWith('<html')) {
        return 'The playlist URL returned HTML instead of an M3U file. The provider may require authentication or block server-side requests.';
    }

    if (sample.startsWith('{') || sample.startsWith('[')) {
        return 'The playlist URL returned JSON instead of an M3U file. Check that the URL points to a playlist file, not an API endpoint.';
    }

    if (!content.includes('#EXTM3U')) {
        return 'The playlist URL did not return an M3U playlist (missing #EXTM3U header).';
    }

    return 'The playlist file could not be parsed as a valid M3U playlist.';
}

function coerceToUtf8String(raw: unknown): string {
    if (typeof raw === 'string') {
        return raw;
    }

    if (raw instanceof ArrayBuffer) {
        return new TextDecoder('utf-8').decode(raw);
    }

    if (
        typeof raw === 'object' &&
        raw !== null &&
        'toString' in raw &&
        typeof (raw as { toString: (encoding?: string) => string }).toString ===
            'function'
    ) {
        const value = raw as { toString: (encoding?: string) => string };
        try {
            return value.toString('utf8');
        } catch {
            return value.toString();
        }
    }

    return String(raw ?? '');
}

export function parseM3uPlaylistContent<T>(
    raw: unknown,
    parse: (content: string) => T
): T {
    const playlistContent = normalizeM3uContent(raw);

    try {
        return parse(playlistContent);
    } catch (error) {
        if (
            error instanceof Error &&
            error.message === 'Playlist is not valid'
        ) {
            throw new Error(describeInvalidM3uContent(playlistContent));
        }

        throw error;
    }
}
