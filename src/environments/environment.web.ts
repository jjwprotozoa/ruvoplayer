import packageJson from '../../package.json';

export const AppConfig = {
    production: true,
    environment: 'WEB',
    version: packageJson.version,
    BACKEND_URL: 'https://ruvoplayer-api.vercel.app',
    // API endpoints for RuvoPlayer
    API_ENDPOINTS: {
        parse: 'https://ruvoplayer-api.vercel.app/parse',
        xtream: 'https://ruvoplayer-api.vercel.app/xtream',
        stalker: 'https://ruvoplayer-api.vercel.app/stalker',
        health: 'https://ruvoplayer-api.vercel.app/health'
    }
};
