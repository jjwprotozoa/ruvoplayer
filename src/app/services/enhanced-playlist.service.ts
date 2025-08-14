import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { Playlist } from '../../../shared/playlist.interface';
import { EpgService } from './epg.service';
import { PlaylistsService } from './playlists.service';
import { SettingsStore } from './settings-store.service';

@Injectable({
    providedIn: 'root',
})
export class EnhancedPlaylistService {
    private playlistsService = inject(PlaylistsService);
    private epgService = inject(EpgService);
    private settingsStore = inject(SettingsStore);
    private snackBar = inject(MatSnackBar);
    private translate = inject(TranslateService);

    /**
     * Loads a playlist with basic functionality
     */
    async loadPlaylist(playlist: Playlist): Promise<void> {
        try {
            // Skip loading if playlist has demo credentials
            if (this.hasDemoCredentials(playlist)) {
                console.warn('Skipping playlist with demo credentials:', playlist.title);
                return;
            }

            // Load regular playlist
            this.loadRegularPlaylist(playlist);
        } catch (error) {
            console.error('Failed to load playlist:', error);
            // Fall back to regular loading
            this.loadRegularPlaylist(playlist);
        }
    }

    private loadRegularPlaylist(playlist: Playlist): void {
        // Standard playlist loading logic
        // Load EPG from settings if available
        const epgUrls = this.settingsStore.epgUrl();
        if (epgUrls && epgUrls.length > 0) {
            this.loadEpgForRoute(epgUrls[0]);
        }
    }

    private loadEpgForRoute(epgUrl: string): void {
        if (!epgUrl) return;

        try {
            this.epgService.fetchEpg([epgUrl]);
        } catch (error) {
            console.error('Failed to load EPG:', error);
        }
    }

    /**
     * Checks if a playlist contains demo credentials
     */
    private hasDemoCredentials(playlist: Playlist): boolean {
        if (!playlist.url) return false;
        return playlist.url.includes('username=demo') || playlist.url.includes('password=demo');
    }
}
