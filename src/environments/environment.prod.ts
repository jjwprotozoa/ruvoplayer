import packageJson from '../../package.json';

export const AppConfig = {
    production: true,
    environment: 'PROD',
    version: packageJson.version,
    BACKEND_URL: 'http://localhost:3333/api',
    // API endpoints for production
    API_ENDPOINTS: {
        parse: 'http://localhost:3333/api/parse',
        xtream: 'http://localhost:3333/api/xtream',
        stalker: 'http://localhost:3333/api/stalker'
    }
};
