import packageJson from '@package';

export const AppConfig = {
    production: true,
    environment: 'PROD',
    version: packageJson.version,
    BACKEND_URL: 'https://ruvoplayer-api.vercel.app',
    BACKEND_URL_BACKUP: 'https://ruvoplayer-api-backup.vercel.app',
};
