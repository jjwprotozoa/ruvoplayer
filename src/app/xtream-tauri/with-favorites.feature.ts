import { inject } from '@angular/core';
import {
    patchState,
    signalStoreFeature,
    withMethods,
    withState,
} from '@ngrx/signals';
import { isTauri } from '@tauri-apps/api/core';
import { DatabaseService } from '../services/database.service';
import { FavoritesService } from './services/favorites.service';

export const withFavorites = function () {
    return signalStoreFeature(
        withState({
            isFavorite: false,
        }),
        withMethods(
            (
                store,
                dbService = inject(DatabaseService),
                favoritesService = inject(FavoritesService)
            ) => ({
                async toggleFavorite(xtreamId: number, playlistId: string) {
                    let result = false;
                    if (!xtreamId || !playlistId) return result;

                    // Check if we're in a Tauri environment
                    if (!isTauri()) {
                        console.warn('Database operations are only available in Tauri desktop environment');
                        return result;
                    }

                    try {
                        const db = await dbService.getConnection();

                        const content: any = await db.select(
                            'SELECT content.id FROM content ' +
                                'INNER JOIN categories ON content.category_id = categories.id ' +
                                'WHERE content.xtream_id = ? AND categories.playlist_id = ?',
                            [xtreamId, playlistId]
                        );

                        if (!content || content.length === 0) {
                            console.error('Content not found in database');
                            return result;
                        }

                        const contentId = content[0].id;
                        const isFavorite = await favoritesService.isFavorite(
                            xtreamId,
                            playlistId
                        );

                        if (isFavorite) {
                            await favoritesService.removeFromFavorites(contentId, playlistId);
                            result = false;
                        } else {
                            await favoritesService.addToFavorites({
                                content_id: contentId,
                                playlist_id: playlistId,
                            });
                            result = true;
                        }

                        patchState(store, { isFavorite: result });
                        return result;
                    } catch (error) {
                        console.error('Failed to toggle favorite:', error);
                        return result;
                    }
                },

                async checkFavoriteStatus(xtreamId: number, playlistId: string) {
                    if (!xtreamId || !playlistId) return;

                    // Check if we're in a Tauri environment
                    if (!isTauri()) {
                        console.warn('Database operations are only available in Tauri desktop environment');
                        return;
                    }

                    try {
                        const isFavorite = await favoritesService.isFavorite(xtreamId, playlistId);
                        patchState(store, { isFavorite });
                    } catch (error) {
                        console.error('Failed to check favorite status:', error);
                    }
                },
            })
        )
    );
};
