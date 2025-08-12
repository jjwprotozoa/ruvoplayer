import packageJson from '../../package.json';

// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `index.ts`, but if you do
// `ng build --env=prod` then `index.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const AppConfig = {
    production: false,
    environment: 'DEV',
    version: packageJson.version,
    BACKEND_URL: 'http://localhost:3333/api',
    // API endpoints for local development
    API_ENDPOINTS: {
        parse: 'http://localhost:3333/api/parse',
        xtream: 'http://localhost:3333/api/xtream',
        stalker: 'http://localhost:3333/api/stalker'
    },
    // Fallback APIs for redundancy
    FALLBACK_APIS: [
        'http://localhost:3333/api'
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
