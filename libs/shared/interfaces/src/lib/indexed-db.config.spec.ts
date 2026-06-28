import {
    DbStores,
    ensurePlaylistsStoreIndexes,
    PLAYLISTS_DB_VERSION,
    dbConfig,
} from './indexed-db.config';

describe('indexed-db.config', () => {
    it('uses a version above legacy Ruvo Player PWA schema', () => {
        expect(PLAYLISTS_DB_VERSION).toBeGreaterThan(3);
        expect(dbConfig.version).toBe(PLAYLISTS_DB_VERSION);
        expect(dbConfig.name).toBe('iptvnator');
    });

    it('adds missing playlist indexes during migration', () => {
        const createdIndexes: string[] = [];
        const store = {
            indexNames: {
                contains: (name: string) => name !== 'recentlyViewed',
            },
            createIndex: (name: string) => {
                createdIndexes.push(name);
            },
        };

        ensurePlaylistsStoreIndexes(
            store as unknown as Pick<
                IDBObjectStore,
                'indexNames' | 'createIndex'
            >
        );

        expect(createdIndexes).toEqual(['recentlyViewed']);
    });

    it('registers a migration for the current playlists store version', () => {
        const transaction = {
            db: {
                objectStoreNames: {
                    contains: (name: string) => name === DbStores.Playlists,
                },
            },
            objectStore: () => ({
                indexNames: {
                    contains: () => true,
                },
                createIndex: jest.fn(),
            }),
        };

        const migration = dbConfig.migrationFactory?.()[PLAYLISTS_DB_VERSION];
        expect(migration).toBeDefined();
        expect(() =>
            migration?.(
                {} as IDBDatabase,
                transaction as unknown as IDBTransaction
            )
        ).not.toThrow();
    });
});
