import { inject, Injectable } from '@angular/core';
import { from, map, mergeMap, Observable } from 'rxjs';
import { DatabaseService } from '../../services/database.service';
import { FavoriteItem } from './favorite-item.interface';

@Injectable({
    providedIn: 'root',
})
export class FavoritesService {
    private dbService = inject(DatabaseService);

    async addToFavorites(item: {
        content_id: number;
        playlist_id: string;
    }): Promise<void> {
        const db = await this.dbService.getConnection();
        await db.execute(
            `INSERT INTO favorites (content_id, playlist_id) 
             VALUES (?, ?)`,
            [item.content_id, item.playlist_id]
        );
    }

    async removeFromFavorites(
        contentId: number,
        playlistId: string
    ): Promise<void> {
        const db = await this.dbService.getConnection();
        await db.execute(
            `DELETE FROM favorites 
             WHERE content_id = ? AND playlist_id = ?`,
            [contentId, playlistId]
        );
    }

    async isFavorite(contentId: number, playlistId: string): Promise<boolean> {
        try {
            const db = await this.dbService.getConnection();
            const result = await db.select(
                'SELECT COUNT(*) as count FROM favorites f JOIN content c ON f.content_id = c.id JOIN categories cat ON c.category_id = cat.id WHERE c.xtream_id = ? AND cat.playlist_id = ?',
                [contentId, playlistId]
            );
            
            // Handle nested array result from Tauri SQL plugin
            const flattenedResult = result.flat();
            return flattenedResult[0]?.count > 0;
        } catch (error) {
            console.error('Error checking favorite status:', error);
            return false;
        }
    }

    getFavorites(playlistId: string): Observable<FavoriteItem[]> {
        return from(this.dbService.getConnection()).pipe(
            mergeMap(async (db) => {
                const result = await db.select(
                    `SELECT 
                        c.*,
                        f.playlist_id,
                        f.added_at
                     FROM favorites f
                     JOIN content c ON f.content_id = c.id
                     WHERE f.playlist_id = ?
                     ORDER BY f.added_at DESC`,
                    [playlistId]
                );
                
                // Handle nested array result from Tauri SQL plugin
                return result.flat();
            }),
            map((results) => results)
        );
    }
}
