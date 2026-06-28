import type { Playlist } from '@iptvnator/shared/interfaces';
import {
    createPlaylistObject,
    getFilenameFromUrl,
    parseM3uPlaylistContent,
} from '@iptvnator/shared/m3u-utils';
import { parse } from 'iptv-playlist-parser';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { createPlaylistAgentFactory } from '../util/secure-https';
import {
    createInvalidTlsCertificateError,
    getHostnameFromErrorUrl,
    isInvalidTlsCertificateError,
} from '../util/security-errors';
import { requestWithValidatedRedirects } from '../util/validated-axios';

export interface PlaylistFetchOptions {
    trustedInsecureTlsHosts?: readonly string[];
    userAgent?: string;
}

// Some providers reject the default `axios/x.y.z` User-Agent. Default to a
// browser-like UA so playlist URL imports behave like the Xtream API path,
// which already sends a browser User-Agent header.
const DEFAULT_PLAYLIST_USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function fetchPlaylistFromUrl(
    url: string,
    title?: string,
    options: PlaylistFetchOptions = {}
): Promise<Playlist> {
    let result;
    try {
        result = await requestWithValidatedRedirects<string>(
            url,
            {
                agentFactory: createPlaylistAgentFactory({
                    trustedInsecureTlsHosts: options.trustedInsecureTlsHosts,
                }),
                method: 'GET',
                headers: {
                    'User-Agent':
                        options.userAgent?.trim() ||
                        DEFAULT_PLAYLIST_USER_AGENT,
                },
            },
            { allowPrivateNetworks: true }
        );
    } catch (error) {
        if (isInvalidTlsCertificateError(error)) {
            throw createInvalidTlsCertificateError(
                getHostnameFromErrorUrl(error, url)
            );
        }
        throw error;
    }

    const parsedPlaylist = parseM3uPlaylistContent(result.data, parse);
    const extractedName = url && url.length > 1 ? getFilenameFromUrl(url) : '';
    const playlistName =
        !extractedName || extractedName === 'Untitled playlist'
            ? 'Imported from URL'
            : extractedName;

    return createPlaylistObject(
        title ?? playlistName,
        parsedPlaylist,
        url,
        'URL'
    );
}

export async function fetchPlaylistFromFile(
    filePath: string,
    title: string
): Promise<Playlist> {
    const fileContent = await readFile(filePath, 'utf-8');
    return createPlaylistObject(
        title,
        parseM3uPlaylistContent(fileContent, parse),
        filePath,
        'FILE'
    );
}

export function derivePlaylistTitleFromFilePath(filePath: string): string {
    const filename = basename(filePath);
    return filename.replace(/\.(m3u8?|pls|txt)$/i, '') || 'from file';
}

export function preserveAutoUpdatedPlaylistFields(
    playlistObject: Playlist,
    playlist: Playlist
): Playlist {
    return {
        ...playlistObject,
        _id: playlist._id,
        autoRefresh: playlist.autoRefresh,
        favorites: playlist.favorites || [],
        userAgent: playlist.userAgent,
    };
}
