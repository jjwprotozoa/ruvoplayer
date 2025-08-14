import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { Playlist } from '../../../shared/playlist.interface';
import { PlaylistMeta } from '../shared/playlist-meta.type';
import { selectActivePlaylist } from '../state/selectors';
import { PlaylistsService } from './playlists.service';

export interface PlaylistInfo {
  title: string;
  url: string;
  isValid: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PlaylistDetectionService {
  constructor(
    private playlistsService: PlaylistsService,
    private store: Store
  ) {}

  /**
   * Detect and setup playlist for basic functionality
   */
  async detectAndSetupPlaylist(): Promise<PlaylistInfo | null> {
    console.log('Starting playlist detection...');
    
    // Try multiple detection methods
    const playlist = await this.tryRouteSnapshot() ||
                    await this.tryActivePlaylist() ||
                    await this.tryConstructFromContext() ||
                    await this.tryAllPlaylists();

    if (playlist && this.isValidPlaylist(playlist)) {
      console.log('Playlist detected successfully:', playlist);
      
      return {
        title: playlist.title || playlist.filename || 'Untitled Playlist',
        url: (playlist as any).url || '',
        isValid: true
      };
    }

    return null;
  }

  /**
   * Try to get playlist from current route
   */
  private tryRouteSnapshot(): Promise<Playlist | PlaylistMeta | null> {
    // This would be called with route params from the component
    return Promise.resolve(null);
  }

  /**
   * Try to get active playlist from store
   */
  private async tryActivePlaylist(): Promise<Playlist | PlaylistMeta | null> {
    try {
      const activePlaylist = await firstValueFrom(this.store.select(selectActivePlaylist));
      if (activePlaylist && this.isValidPlaylist(activePlaylist)) {
        console.log('Using active playlist from store:', activePlaylist);
        return activePlaylist;
      }
    } catch (error) {
      console.error('Failed to get active playlist from store:', error);
    }
    return null;
  }

  /**
   * Try to construct playlist from context
   */
  private async tryConstructFromContext(): Promise<Playlist | PlaylistMeta | null> {
    try {
      const currentPlaylist = await firstValueFrom(this.store.select(selectActivePlaylist));
      if (currentPlaylist && (currentPlaylist as any).serverUrl && 
          (currentPlaylist as any).username && (currentPlaylist as any).password) {
        
        const constructedUrl = `${(currentPlaylist as any).serverUrl}/get.php?username=${(currentPlaylist as any).username}&password=${encodeURIComponent((currentPlaylist as any).password)}&type=m3u_plus&output=ts`;
        
        return {
          ...currentPlaylist,
          url: constructedUrl
        } as Playlist | PlaylistMeta;
      }
    } catch (error) {
      console.error('Failed to construct playlist from context:', error);
    }
    return null;
  }

  /**
   * Try to find valid playlist from all available playlists
   */
  private async tryAllPlaylists(): Promise<Playlist | PlaylistMeta | null> {
    try {
      const playlists = await firstValueFrom(this.playlistsService.getAllPlaylists()) as (Playlist | PlaylistMeta)[];
      return playlists.find(playlist => this.isValidPlaylist(playlist)) || null;
    } catch (error) {
      console.error('Failed to load all playlists:', error);
      return null;
    }
  }

  /**
   * Check if playlist is valid for basic functionality
   */
  private isValidPlaylist(playlist: Playlist | PlaylistMeta): boolean {
    const hasDirectUrl = !!(playlist as any).url && (
      (playlist as any).url.includes('get.php') ||
      (playlist as any).url.includes('xmltv.php') ||
      (playlist as any).url.includes('cdn-ak.me') ||
      (playlist as any).url.includes('ruvoplay.online') ||
      (playlist as any).url.includes('http')
    );
    
    const hasCredConfig = !!(playlist as any).serverUrl && 
                         !!(playlist as any).username && 
                         !!(playlist as any).password;
    
    const hasLocalFile = !!(playlist as any).filename;
    
    return hasDirectUrl || hasCredConfig || hasLocalFile;
  }
}

