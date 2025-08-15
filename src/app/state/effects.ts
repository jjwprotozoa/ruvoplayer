import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { isTauri } from '@tauri-apps/api/core';
import { catchError, map, mergeMap, of, switchMap } from 'rxjs';
import { PlaylistsService } from '../services/playlists.service';
import * as PlaylistActions from './actions';

// Define the Database type without importing it at module level
type Database = any;

@Injectable({ providedIn: 'any' })
export class PlaylistEffects {
    constructor(
        private actions$: Actions,
        private playlistsService: PlaylistsService,
        private store: Store
    ) {}

    loadPlaylists$ = createEffect(() =>
        this.actions$.pipe(
            ofType(PlaylistActions.loadPlaylists),
            mergeMap(() =>
                this.playlistsService.getAllPlaylists().pipe(
                    map((playlists) => PlaylistActions.loadPlaylistsSuccess({ playlists })),
                    catchError((error) => of(PlaylistActions.loadPlaylistsFailure({ error })))
                )
            )
        )
    );

    addPlaylist$ = createEffect(() =>
        this.actions$.pipe(
            ofType(PlaylistActions.addPlaylist),
            mergeMap(({ playlist }) =>
                this.playlistsService.addPlaylist(playlist).pipe(
                    map((addedPlaylist) => PlaylistActions.addPlaylistSuccess({ playlist: addedPlaylist })),
                    catchError((error) => of(PlaylistActions.addPlaylistFailure({ error })))
                )
            )
        )
    );

    updatePlaylist$ = createEffect(() =>
        this.actions$.pipe(
            ofType(PlaylistActions.updatePlaylist),
            mergeMap(({ playlistId, playlist }) =>
                this.playlistsService.updatePlaylist(playlistId, playlist).pipe(
                    map((updatedPlaylist) => PlaylistActions.updatePlaylistSuccess({ playlist: updatedPlaylist })),
                    catchError((error) => of(PlaylistActions.updatePlaylistFailure({ error })))
                )
            )
        )
    );

    deletePlaylist$ = createEffect(() =>
        this.actions$.pipe(
            ofType(PlaylistActions.removePlaylist),
            mergeMap(({ playlistId }) =>
                this.playlistsService.deletePlaylist(playlistId).pipe(
                    map(() => PlaylistActions.removePlaylistSuccess({ playlistId })),
                    catchError((error) => of(PlaylistActions.removePlaylistFailure({ error })))
                )
            )
        )
    );

    // Tauri-specific effect for saving playlist data to SQLite
    savePlaylistToDatabase$ = createEffect(() =>
        this.actions$.pipe(
            ofType(PlaylistActions.addPlaylistSuccess),
            switchMap(async ({ playlist }) => {
                // Only proceed if we're in a Tauri environment
                if (!isTauri()) {
                    return of({ type: 'NO_ACTION' });
                }

                try {
                    // Dynamically import the Tauri SQL plugin only when needed
                    const module = await import('@tauri-apps/plugin-sql');
                    const Database = module.default;
                    
                    const db = await Database.load('sqlite:database.db');
                    
                    // Save playlist metadata to database
                    await db.execute(
                        'INSERT OR REPLACE INTO playlists (id, name, serverUrl, username, password, type) VALUES (?, ?, ?, ?, ?, ?)',
                        [
                            playlist._id,
                            playlist.title,
                            playlist.serverUrl || '',
                            playlist.username || '',
                            playlist.password || '',
                            'xtream', // Default type
                        ]
                    );

                    return of({ type: 'DATABASE_SAVE_SUCCESS' });
                } catch (error) {
                    console.error('Failed to save playlist to database:', error);
                    return of({ type: 'DATABASE_SAVE_FAILURE', error });
                }
            })
        ),
        { dispatch: false }
    );
}
