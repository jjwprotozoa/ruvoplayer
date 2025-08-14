import { Injectable } from '@angular/core';
import { isTauri } from '@tauri-apps/api/core';
import { PlaylistMeta } from '../shared/playlist-meta.type';

export interface XCategoryFromDb {
    id: number;
    name: string;
    playlist_id: string;
    type: 'movies' | 'live' | 'series';
    xtream_id: number;
}

export interface XtreamContent {
    id: number;
    category_id: number;
    title: string;
    rating: string;
    added: string;
    poster_url: string;
    xtream_id: number;
    type: string;
}

export interface XtreamPlaylist {
    id: string;
    name: string;
    serverUrl: string;
    username: string;
    password: string;
    type: string;
}

export interface GlobalSearchResult extends XtreamContent {
    playlist_id: string;
    playlist_name: string;
}

export interface GlobalRecentItem extends XtreamContent {
    playlist_id: string;
    playlist_name: string;
    viewed_at: string;
}

// Define a proper interface for the Database type
interface Database {
    execute(sql: string, params?: any[]): Promise<any>;
    select<T = any>(sql: string, params?: any[]): Promise<T[][]>; // Tauri returns nested arrays
    load(path: string): Promise<Database>;
}

@Injectable({
    providedIn: 'root',
})
export class DatabaseService {
    private static db: Database | null = null;
    private static DatabaseClass: any = null;

    private async getDatabaseClass(): Promise<any> {
        if (!DatabaseService.DatabaseClass) {
            try {
                // Dynamically import the Tauri SQL plugin only when needed
                const module = await import('@tauri-apps/plugin-sql');
                DatabaseService.DatabaseClass = module.default;
            } catch (error) {
                console.error('Failed to load Tauri SQL plugin:', error);
                throw new Error('Tauri SQL plugin not available');
            }
        }
        return DatabaseService.DatabaseClass;
    }

    async getConnection(): Promise<Database> {
        // Check if we're in a Tauri environment before trying to use the SQL plugin
        if (!isTauri()) {
            throw new Error('Database operations are only available in Tauri desktop environment');
        }

        if (!DatabaseService.db) {
            try {
                const DatabaseClass = await this.getDatabaseClass();
                DatabaseService.db = await DatabaseClass.load('sqlite:database.db');
            } catch (error) {
                console.error('Failed to load database:', error);
                throw new Error('Failed to initialize database connection');
            }
        }
        return DatabaseService.db;
    }

    /**
     * Delete a playlist and all its related data
     * @param playlistId ID of the playlist to delete
     * @returns True if deletion was successful
     */
    async deletePlaylist(playlistId: string): Promise<boolean> {
        // Check if we're in a Tauri environment
        if (!isTauri()) {
            console.warn('Database operations are only available in Tauri desktop environment');
            return false;
        }

        try {
            const db = await this.getConnection();

            // Start a transaction to ensure all related data is deleted
            await db.execute('BEGIN TRANSACTION');

            try {
                // First, delete favorites related to the playlist to reduce foreign key checks
                await db.execute(
                    'DELETE FROM favorites WHERE playlist_id = ?',
                    [playlistId]
                );

                // Delete recently_viewed entries directly using playlist_id
                await db.execute(
                    'DELETE FROM recently_viewed WHERE playlist_id = ?',
                    [playlistId]
                );

                // Get category IDs first to speed up content deletion (avoids subquery)
                const categories = await db.select<{ id: number }[]>(
                    'SELECT id FROM categories WHERE playlist_id = ?',
                    [playlistId]
                );

                if (categories.length > 0) {
                    // Handle nested array result from Tauri SQL plugin
                    const flattenedCategories = categories.flat() as unknown as { id: number }[];
                    if (flattenedCategories.length > 0) {
                        // Create a list of category IDs for the IN clause
                        const categoryIds = flattenedCategories.map((cat) => cat.id);

                        // Delete content in batches if there are many categories
                        const BATCH_SIZE = 20;
                        for (let i = 0; i < categoryIds.length; i += BATCH_SIZE) {
                            const batchIds = categoryIds.slice(i, i + BATCH_SIZE);
                            const placeholders = batchIds.map(() => '?').join(',');

                            await db.execute(
                                `DELETE FROM content WHERE category_id IN (${placeholders})`,
                                batchIds
                            );
                        }
                    }
                }

                // Delete categories related to the playlist
                await db.execute(
                    'DELETE FROM categories WHERE playlist_id = ?',
                    [playlistId]
                );

                // Finally, delete the playlist itself
                await db.execute('DELETE FROM playlists WHERE id = ?', [
                    playlistId,
                ]);

                // Commit the transaction
                await db.execute('COMMIT');
                console.log('Playlist deleted successfully');
                return true;
            } catch (error) {
                // If any error occurs, rollback the transaction
                console.error('Error in transaction, rolling back:', error);
                await db.execute('ROLLBACK');
                throw error;
            }
        } catch (error) {
            console.error('Error deleting playlist:', error);
            return false;
        }
    }

    async updateXtreamPlaylist(playlist: any): Promise<boolean> {
        // Check if we're in a Tauri environment
        if (!isTauri()) {
            console.warn('Database operations are only available in Tauri desktop environment');
            return false;
        }

        try {
            const db = await this.getConnection();
            await db.execute('UPDATE playlists SET name = ? WHERE id = ?', [
                playlist.name,
                playlist.id,
            ]);
            return true;
        } catch (error) {
            console.error('Error updating playlist:', error);
            return false;
        }
    }

    async updateXtreamPlaylistDetails(playlist: {
        id: string;
        title: string;
        username?: string;
        password?: string;
        serverUrl?: string;
    }): Promise<boolean> {
        // Check if we're in a Tauri environment
        if (!isTauri()) {
            console.warn('Database operations are only available in Tauri desktop environment');
            return false;
        }

        try {
            const db = await this.getConnection();
            const updateFields: string[] = ['name = ?'];
            const params: any[] = [playlist.title];

            if (playlist.username) {
                updateFields.push('username = ?');
                params.push(playlist.username);
            }
            if (playlist.password) {
                updateFields.push('password = ?');
                params.push(playlist.password);
            }
            if (playlist.serverUrl) {
                updateFields.push('serverUrl = ?');
                params.push(playlist.serverUrl);
            }

            params.push(playlist.id);

            console.log(params);

            const query = `UPDATE playlists SET ${updateFields.join(', ')} WHERE id = ?`;
            await db.execute(query, params);
            return true;
        } catch (error) {
            console.error('Error updating playlist details:', error);
            return false;
        }
    }

    async hasXtreamCategories(
        playlistId: string,
        type: 'live' | 'movies' | 'series'
    ): Promise<boolean> {
        // Check if we're in a Tauri environment
        if (!isTauri()) {
            console.warn('Database operations are only available in Tauri desktop environment');
            return false;
        }

        try {
            const db = await this.getConnection();
            const result = await db.select<XCategoryFromDb[]>(
                'SELECT * FROM categories WHERE playlist_id = ? AND type = ?',
                [playlistId, type]
            );
            return result.length > 0;
        } catch (error) {
            console.error('Error checking categories:', error);
            return false;
        }
    }

    async getXtreamCategories(
        playlistId: string,
        type: 'live' | 'movies' | 'series'
    ): Promise<XCategoryFromDb[]> {
        // Check if we're in a Tauri environment
        if (!isTauri()) {
            console.warn('Database operations are only available in Tauri desktop environment');
            return [];
        }

        try {
            const db = await this.getConnection();
            const categories = await db.select<{ id: number }[]>(
                'SELECT id FROM categories WHERE playlist_id = ? AND type = ?',
                [playlistId, type]
            );
            
            // Handle nested array result from Tauri SQL plugin
            const flattenedCategories = categories.flat() as unknown as { id: number }[];
            const categoryIds = flattenedCategories.map((cat) => cat.id);
            
            if (categoryIds.length === 0) {
                return [];
            }

            const placeholders = categoryIds.map(() => '?').join(',');
            const result = await db.select<XCategoryFromDb[]>(
                `SELECT * FROM categories WHERE id IN (${placeholders})`,
                categoryIds
            );
            
            // Flatten the nested array result
            return result.flat() as unknown as XCategoryFromDb[];
        } catch (error) {
            console.error('Error getting categories:', error);
            return [];
        }
    }

    async getXtreamCategoriesByType(
        playlistId: string,
        type: 'live' | 'movies' | 'series'
    ): Promise<XCategoryFromDb[]> {
        // Check if we're in a Tauri environment
        if (!isTauri()) {
            console.warn('Database operations are only available in Tauri desktop environment');
            return [];
        }

        try {
            const db = await this.getConnection();
            const result = await db.select<XCategoryFromDb[]>(
                'SELECT * FROM categories WHERE playlist_id = ? AND type = ?',
                [playlistId, type]
            );
            
            // Flatten the nested array result
            return result.flat() as unknown as XCategoryFromDb[];
        } catch (error) {
            console.error('Error getting categories by type:', error);
            return [];
        }
    }

    async saveXtreamContent(
        playlistId: string,
        streams: any[],
        type: 'live' | 'movie' | 'series',
        onProgress?: (count: number) => void
    ): Promise<number> {
        // Check if we're in a Tauri environment
        if (!isTauri()) {
            console.warn('Database operations are only available in Tauri desktop environment');
            return 0;
        }

        try {
            const db = await this.getConnection();
            let insertedCount = 0;

            for (const stream of streams) {
                try {
                    const categories = await db.select<{ id: number; xtream_id: number }[]>(
                        'SELECT id, xtream_id FROM categories WHERE playlist_id = ? AND type = ? AND xtream_id = ?',
                        [playlistId, type, stream.category_id]
                    );
                    
                    // Handle nested array result from Tauri SQL plugin
                    const flattenedCategories = categories.flat() as unknown as { id: number; xtream_id: number }[];
                    const categoryMap = new Map(
                        flattenedCategories.map((c) => [parseInt(c.xtream_id.toString()), c.id])
                    );

                    const categoryId = categoryMap.get(stream.category_id);
                    if (categoryId) {
                        await db.execute(
                            'INSERT OR REPLACE INTO content (category_id, title, rating, added, poster_url, xtream_id, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
                            [
                                categoryId,
                                stream.name || stream.title || '',
                                stream.rating || '',
                                stream.added || '',
                                stream.stream_icon || stream.poster_path || '',
                                stream.stream_id || stream.id,
                                type,
                            ]
                        );
                        insertedCount++;
                    }

                    if (onProgress) {
                        onProgress(insertedCount);
                    }
                } catch (error) {
                    console.error('Error inserting stream:', error);
                }
            }

            return insertedCount;
        } catch (error) {
            console.error('Error saving content:', error);
            return 0;
        }
    }

    async searchXtreamContent(
        playlistId: string,
        searchTerm: string,
        types: string[]
    ): Promise<XtreamContent[]> {
        // Check if we're in a Tauri environment
        if (!isTauri()) {
            console.warn('Database operations are only available in Tauri desktop environment');
            return [];
        }

        try {
            const db = await this.getConnection();
            const placeholders = types.map(() => '?').join(',');
            const result = await db.select(
                `SELECT c.* FROM content c 
                 JOIN categories cat ON c.category_id = cat.id 
                 WHERE (c.title LIKE ?)
                 AND cat.playlist_id = ?
                 AND c.type IN (${placeholders})
                 LIMIT 50`,
                [`%${searchTerm}%`, playlistId, ...types]
            );
            
            // Flatten the nested array result
            return result.flat() as unknown as XtreamContent[];
        } catch (error) {
            console.error('Error searching content:', error);
            return [];
        }
    }

    async globalSearchContent(
        searchTerm: string,
        types: string[]
    ): Promise<GlobalSearchResult[]> {
        // Check if we're in a Tauri environment
        if (!isTauri()) {
            console.warn('Database operations are only available in Tauri desktop environment');
            return [];
        }

        try {
            const placeholders = types.map(() => '?').join(',');
            const db = await this.getConnection();
            const result = await db.select(
                `
                WITH filtered_content AS (
                    SELECT 
                        c.id,
                        c.category_id,
                        c.title,
                        c.rating,
                        c.added,
                        c.poster_url,
                        c.xtream_id,
                        c.type,
                        cat.playlist_id,
                        p.name as playlist_name
                    FROM content c 
                    INNER JOIN categories cat ON c.category_id = cat.id
                    INNER JOIN playlists p ON cat.playlist_id = p.id
                    WHERE c.type IN (${placeholders})
                )
                SELECT * FROM filtered_content
                WHERE LOWER(title) LIKE LOWER(?)
                ORDER BY title
                LIMIT 50
            `,
                [...types, `%${searchTerm}%`]
            );
            
            // Flatten the nested array result
            return result.flat() as unknown as GlobalSearchResult[];
        } catch (error) {
            console.error('Error in global search:', error);
            return [];
        }
    }

    async getGlobalRecentlyViewed(): Promise<GlobalRecentItem[]> {
        // Check if we're in a Tauri environment
        if (!isTauri()) {
            console.warn('Database operations are only available in Tauri desktop environment');
            return [];
        }

        try {
            console.log('Starting getGlobalRecentlyViewed query...');
            const db = await this.getConnection();
            console.log('Got database connection');

            // Check if table exists
            const tableCheck = await db.select(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='recently_viewed'
            `);
            console.log('Tables check:', tableCheck);

            const items = await db.select(`
                SELECT 
                    c.id,
                    c.category_id,
                    c.title,
                    c.rating,
                    c.added,
                    c.poster_url,
                    c.xtream_id,
                    c.type,
                    cat.playlist_id,
                    p.name as playlist_name,
                    rv.viewed_at
                FROM recently_viewed rv
                INNER JOIN content c ON rv.content_id = c.id
                INNER JOIN categories cat ON c.category_id = cat.id
                INNER JOIN playlists p ON cat.playlist_id = p.id
                ORDER BY rv.viewed_at DESC
                LIMIT 100
            `);
            
            // Flatten the nested array result
            return items.flat() as unknown as GlobalRecentItem[] || [];
        } catch (error) {
            console.error('Error getting global recently viewed:', error);
            return [];
        }
    }

    async clearGlobalRecentlyViewed(): Promise<void> {
        // Check if we're in a Tauri environment
        if (!isTauri()) {
            console.warn('Database operations are only available in Tauri desktop environment');
            return;
        }

        try {
            const db = await this.getConnection();
            await db.execute('DELETE FROM recently_viewed');
        } catch (error) {
            console.error('Error clearing global recently viewed:', error);
            throw error;
        }
    }

    async getPlaylistById(playlistId: string): Promise<XtreamPlaylist | null> {
        // Check if we're in a Tauri environment
        if (!isTauri()) {
            console.warn('Database operations are only available in Tauri desktop environment');
            return null;
        }

        try {
            const db = await this.getConnection();
            const results = await db.select<XtreamPlaylist[]>(
                'SELECT * FROM playlists WHERE id = ?',
                [playlistId]
            );
            
            // Handle nested array result from Tauri SQL plugin
            const flattenedResults = results.flat() as unknown as XtreamPlaylist[];
            return flattenedResults[0] || null;
        } catch (error) {
            console.error('Error getting playlist by ID:', error);
            return null;
        }
    }

    async createPlaylist(playlist: PlaylistMeta): Promise<void> {
        // Check if we're in a Tauri environment
        if (!isTauri()) {
            console.warn('Database operations are only available in Tauri desktop environment');
            return;
        }

        try {
            const db = await this.getConnection();
            await db.execute(
                'INSERT INTO playlists (id, name, serverUrl, username, password, type) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    playlist._id,
                    playlist.title,
                    playlist.serverUrl,
                    playlist.username,
                    playlist.password,
                    'xtream',
                ]
            );
        } catch (error) {
            console.error('Error creating playlist:', error);
            throw error;
        }
    }

    private prepareBulkInsertData(
        streams: any[],
        type: string,
        categoryMap: Map<number, number>
    ): any[] {
        return streams
            .map((stream) => {
                const streamCategoryId =
                    type === 'series'
                        ? parseInt(stream.category_id || '0')
                        : parseInt(stream.category_id);

                const categoryId = categoryMap.get(streamCategoryId);
                if (!categoryId) return null;

                const title =
                    type === 'series'
                        ? stream.title ||
                          stream.name ||
                          `Unknown Series ${stream.series_id}`
                        : stream.name ||
                          stream.title ||
                          `Unknown Stream ${stream.stream_id}`;

                return [
                    categoryId,
                    title,
                    stream.rating || stream.rating_imdb || '',
                    type === 'series'
                        ? stream.last_modified || ''
                        : stream.added || '',
                    stream.stream_icon || stream.poster || stream.cover || '',
                    type === 'series'
                        ? parseInt(stream.series_id || '0')
                        : parseInt(stream.stream_id || '0'),
                    type,
                ];
            })
            .filter((data) => data !== null);
    }

    private async executeBulkInsert(
        db: Database,
        data: any[],
        onProgress?: (count: number) => void
    ): Promise<number> {
        const CHUNK_SIZE = 100;
        let totalInserted = 0;

        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            const chunk = data.slice(i, i + CHUNK_SIZE);
            const placeholders = chunk
                .map(() => '(?, ?, ?, ?, ?, ?, ?)')
                .join(', ');
            const query = `
                INSERT INTO content (
                    category_id, title, rating, added,
                    poster_url, xtream_id, type
                ) VALUES ${placeholders}
            `;

            try {
                await db.execute(query, chunk.flat());
                totalInserted += chunk.length;
                onProgress?.(totalInserted);
            } catch (err) {
                console.error('Error in bulk insert chunk:', err);
            }
        }

        return totalInserted;
    }

    async getXtreamPlaylists(): Promise<XtreamPlaylist[]> {
        // Check if we're in a Tauri environment
        if (!isTauri()) {
            console.warn('Database operations are only available in Tauri desktop environment');
            return [];
        }

        try {
            const db = await this.getConnection();
            const results = await db.select(
                'SELECT id, name, serverUrl, username, password, type FROM playlists WHERE type = "xtream"'
            );
            
            // Flatten the nested array result
            return results.flat() as unknown as XtreamPlaylist[];
        } catch (error) {
            console.error('Error getting Xtream playlists:', error);
            return [];
        }
    }

    async saveXtreamCategories(
        playlistId: string,
        categories: any[],
        type: 'live' | 'movies' | 'series'
    ): Promise<void> {
        // Check if we're in a Tauri environment
        if (!isTauri()) {
            console.warn('Database operations are only available in Tauri desktop environment');
            return;
        }

        try {
            const db = await this.getConnection();
            for (const category of categories) {
                await db.execute(
                    'INSERT INTO categories (playlist_id, name, type, xtream_id) VALUES (?, ?, ?, ?)',
                    [playlistId, category.category_name, type, category.category_id]
                );
            }
        } catch (error) {
            console.error('Error saving categories:', error);
        }
    }

    async hasXtreamContent(
        playlistId: string,
        type: 'live' | 'movie' | 'series'
    ): Promise<boolean> {
        // Check if we're in a Tauri environment
        if (!isTauri()) {
            console.warn('Database operations are only available in Tauri desktop environment');
            return false;
        }

        try {
            const db = await this.getConnection();
            const result = await db.select(
                `SELECT c.* FROM content c 
                 JOIN categories cat ON c.category_id = cat.id 
                 WHERE cat.playlist_id = ? AND c.type = ?
                 ORDER BY c.added`,
                [playlistId, type]
            );
            
            // Handle nested array result from Tauri SQL plugin
            const flattenedResult = result.flat();
            return flattenedResult.length > 0;
        } catch (error) {
            console.error('Error checking content:', error);
            return false;
        }
    }

    async getXtreamContent(
        playlistId: string,
        type: 'live' | 'movie' | 'series'
    ): Promise<XtreamContent[]> {
        // Check if we're in a Tauri environment
        if (!isTauri()) {
            console.warn('Database operations are only available in Tauri desktop environment');
            return [];
        }

        try {
            const db = await this.getConnection();
            const result = await db.select(
                `SELECT 
                    c.id, c.category_id, c.title, c.rating, 
                    c.added, c.poster_url, c.xtream_id, c.type
                FROM content c 
                INNER JOIN categories cat ON c.category_id = cat.id 
                WHERE cat.playlist_id = ? AND c.type = ?
                ORDER BY c.added DESC`,
                [playlistId, type]
            );
            
            // Flatten the nested array result
            return result.flat() as unknown as XtreamContent[];
        } catch (error) {
            console.error('Error getting content:', error);
            return [];
        }
    }
}
