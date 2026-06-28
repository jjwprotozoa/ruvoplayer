import packageJson from '@package';

export const AppConfig = {
    production: false,
    environment: 'WEB',
    version: packageJson.version,
    BACKEND_URL: 'https://ruvoplayer-api.vercel.app',
    BACKEND_URL_BACKUP: 'https://ruvoplayer-api-backup.vercel.app',
};
