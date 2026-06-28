import { DBConfig, ObjectStoreSchema } from 'ngx-indexed-db';

/**
 * Contains names of the database stores
 */
export enum DbStores {
    Playlists = 'playlists',
}

/**
 * Legacy Ruvo Player PWA builds opened `iptvnator` at version 3.
 * IPTVnator monorepo PWA must stay above that version to avoid
 * IndexedDB VersionError on first load after the app switch.
 */
export const PLAYLISTS_DB_VERSION = 4;

const playlistsStoreSchema: ObjectStoreSchema[] = [
    {
        name: '_id',
        keypath: '_id',
        options: { unique: false },
    },
    {
        name: 'filename',
        keypath: 'filename',
        options: { unique: false },
    },
    { name: 'title', keypath: 'title', options: { unique: false } },
    { name: 'count', keypath: 'count', options: { unique: false } },
    {
        name: 'playlist',
        keypath: 'playlist',
        options: { unique: false },
    },
    {
        name: 'importDate',
        keypath: 'importDate',
        options: { unique: false },
    },
    {
        name: 'lastUsage',
        keypath: 'lastUsage',
        options: { unique: false },
    },
    {
        name: 'favorites',
        keypath: 'favorites',
        options: { unique: false },
    },
    {
        name: 'recentlyViewed',
        keypath: 'recentlyViewed',
        options: { unique: false },
    },
    {
        name: 'autoRefresh',
        keypath: 'autoRefresh',
        options: { unique: false },
    },
    {
        name: 'url',
        keypath: 'url',
        options: { unique: false },
    },
    {
        name: 'filePath',
        keypath: 'filePath',
        options: { unique: false },
    },
];

export function ensurePlaylistsStoreIndexes(
    store: Pick<IDBObjectStore, 'indexNames' | 'createIndex'>,
    storeSchema: ObjectStoreSchema[] = playlistsStoreSchema
): void {
    for (const schema of storeSchema) {
        if (!store.indexNames.contains(schema.name)) {
            store.createIndex(schema.name, schema.keypath, schema.options);
        }
    }
}

/** Defines db tables and schema */
export const dbConfig: DBConfig = {
    name: 'iptvnator',
    version: PLAYLISTS_DB_VERSION,
    objectStoresMeta: [
        {
            store: DbStores.Playlists,
            storeConfig: { keyPath: '_id', autoIncrement: false },
            storeSchema: playlistsStoreSchema,
        },
    ],
    migrationFactory: () => ({
        [PLAYLISTS_DB_VERSION]: (_db, transaction) => {
            if (
                !transaction.db.objectStoreNames.contains(DbStores.Playlists)
            ) {
                return;
            }

            ensurePlaylistsStoreIndexes(
                transaction.objectStore(DbStores.Playlists)
            );
        },
    }),
};
