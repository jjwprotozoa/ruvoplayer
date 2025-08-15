import { inject } from '@angular/core';
import {
    patchState,
    signalStoreFeature,
    withMethods,
    withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { isTauri } from '@tauri-apps/api/core';
import { pipe, switchMap, tap } from 'rxjs';
import { DatabaseService } from '../services/database.service';

export interface RecentlyViewedItem {
    id: number;
    title: string;
    type: string;
    poster_url: string;
    content_id: number;
    playlist_id: string;
    viewed_at: string;
    xtream_id: number;
    category_id: number;
}

export const withRecentItems = function () {
    return signalStoreFeature(
        withState({
            recentItems: [],
        }),
        withMethods((store, dbService = inject(DatabaseService)) => ({
            loadRecentItems: rxMethod<{ id: string }>(
                pipe(
                    switchMap(async (playlist) => {
                        if (!playlist) return [];
                        
                        // Check if we're in a Tauri environment
                        if (!isTauri()) {
                            console.warn('Database operations are only available in Tauri desktop environment');
                            return [];
                        }

                        try {
                            console.log(
                                'Loading recent items for playlist',
                                playlist.id
                            );
                            const db = await dbService.getConnection();
                            const result = await db.select<RecentlyViewedItem[]>(
                                `SELECT 
                                    rv.id,
                                    c.title,
                                    c.type,
                                    c.poster_url,
                                    c.id as content_id,
                                    rv.playlist_id,
                                    rv.viewed_at,
                                    c.xtream_id,
                                    c.category_id
                                FROM recently_viewed rv
                                JOIN content c ON rv.content_id = c.id
                                WHERE rv.playlist_id = ?
                                ORDER BY rv.viewed_at DESC
                                LIMIT 50`,
                                [playlist.id]
                            );
                            
                            // Handle nested array result from Tauri SQL plugin
                            const flattenedResult = result.flat();
                            return flattenedResult as unknown as RecentlyViewedItem[];
                        } catch (error) {
                            console.error('Failed to load recent items:', error);
                            return [];
                        }
                    }),
                    tap((items: RecentlyViewedItem[]) =>
                        patchState(store, { recentItems: items })
                    )
                )
            ),
        })),
        withMethods((store, dbService = inject(DatabaseService)) => ({
            addRecentItem: rxMethod<{
                contentId: number;
                playlist: { id: string };
            }>(
                pipe(
                    switchMap(async ({ contentId, playlist }) => {
                        if (!playlist.id) {
                            console.error('No active playlist found');
                            return;
                        }

                        // Check if we're in a Tauri environment
                        if (!isTauri()) {
                            console.warn('Database operations are only available in Tauri desktop environment');
                            return;
                        }

                        try {
                            console.log(
                                'Adding to recently viewed:',
                                playlist.id
                            );

                            const db = await dbService.getConnection();

                            const content: any = await db.select(
                                'SELECT content.id FROM content ' +
                                    'INNER JOIN categories ON content.category_id = categories.id ' +
                                    'WHERE content.xtream_id = ? AND categories.playlist_id = ?',
                                [contentId, playlist.id]
                            );

                            if (!content || content.length === 0) {
                                console.error('Content not found in database');
                                return;
                            }

                            // Handle nested array result from Tauri SQL plugin
                            const flattenedContent = content.flat();
                            if (flattenedContent.length === 0) {
                                console.error('Content not found in database');
                                return;
                            }

                            const contentIdFromDb = flattenedContent[0].id;

                            // Check if item already exists
                            const existing = await db.select(
                                'SELECT id FROM recently_viewed WHERE content_id = ? AND playlist_id = ?',
                                [contentIdFromDb, playlist.id]
                            );

                            if (existing.length > 0) {
                                // Update existing entry
                                const flattenedExisting = existing.flat();
                                if (flattenedExisting.length > 0) {
                                    await db.execute(
                                        'UPDATE recently_viewed SET viewed_at = CURRENT_TIMESTAMP WHERE id = ?',
                                        [flattenedExisting[0].id]
                                    );
                                }
                            } else {
                                // Insert new entry
                                await db.execute(
                                    'INSERT INTO recently_viewed (content_id, playlist_id) VALUES (?, ?)',
                                    [contentIdFromDb, playlist.id]
                                );
                            }

                            // Reload recent items
                            this.loadRecentItems(playlist);
                        } catch (error) {
                            console.error('Failed to add recent item:', error);
                        }
                    })
                )
            ),
            clearRecentItems: rxMethod<{ id: string }>(
                pipe(
                    switchMap(async (playlist) => {
                        // Check if we're in a Tauri environment
                        if (!isTauri()) {
                            console.warn('Database operations are only available in Tauri desktop environment');
                            return;
                        }

                        try {
                            console.log(
                                'Clearing recent items for playlist',
                                playlist.id
                            );
                            const db = await dbService.getConnection();
                            await db.execute(
                                `DELETE FROM recently_viewed WHERE playlist_id = ?`,
                                [playlist.id]
                            );
                            return store.loadRecentItems({ id: playlist.id });
                        } catch (error) {
                            console.error('Failed to clear recent items:', error);
                        }
                    })
                )
            ),
            removeRecentItem: rxMethod<{ itemId: number; playlistId: string }>(
                pipe(
                    switchMap(async ({ itemId, playlistId }) => {
                        // Check if we're in a Tauri environment
                        if (!isTauri()) {
                            console.warn('Database operations are only available in Tauri desktop environment');
                            return;
                        }

                        try {
                            const db = await dbService.getConnection();
                            await db.execute(
                                `DELETE FROM recently_viewed WHERE id = ? AND playlist_id = ?`,
                                [itemId, playlistId]
                            );
                            return store.loadRecentItems({ id: playlistId });
                        } catch (error) {
                            console.error('Failed to remove recent item:', error);
                        }
                    })
                )
            ),
            async loadGlobalRecentItems() {
                try {
                    const items = await dbService.getGlobalRecentlyViewed();
                    patchState(store, {
                        recentItems: items || [],
                    });
                } catch (error) {
                    console.error('Error loading global recent items:', error);
                    patchState(store, { recentItems: [] });
                }
            },
            async clearGlobalRecentlyViewed() {
                try {
                    await dbService.clearGlobalRecentlyViewed();
                    patchState(store, { recentItems: [] });
                } catch (error) {
                    console.error(
                        'Error clearing global recently viewed:',
                        error
                    );
                }
            },
        }))
    );
};
