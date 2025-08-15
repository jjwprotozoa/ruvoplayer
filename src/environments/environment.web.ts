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
    },
    // Fallback APIs for redundancy
    FALLBACK_APIS: [
        'https://ruvoplayer-api.vercel.app',        // Primary API
        'https://ruvoplayer-api-backup.vercel.app'  // Backup API
    ],
    // Timeout configurations for better error handling
    TIMEOUTS: {
        DIRECT_FETCH: 15000,        // 15 seconds for direct playlist fetch
        BACKEND_PROXY: 20000,       // 20 seconds for backend proxy requests
        XTREAM_API: 30000,          // 30 seconds for Xtream API calls
        OVERALL_REQUEST: 45000      // 45 seconds total request timeout
    },
    // Retry configuration
    RETRY_CONFIG: {
        MAX_RETRIES: 2,
        RETRY_DELAY: 1000,          // 1 second delay between retries
        BACKOFF_MULTIPLIER: 2       // Exponential backoff multiplier
    }
};
