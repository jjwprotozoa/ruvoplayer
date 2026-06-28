// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `index.ts`, but if you do
// `ng build --env=prod` then `index.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

import packageJson from '@package';

export const AppConfig = {
    production: false,
    environment: 'DEV',
    version: packageJson.version,
    BACKEND_URL: 'https://ruvoplayer-api.vercel.app',
    BACKEND_URL_BACKUP: 'https://ruvoplayer-api-backup.vercel.app',
    GITHUB_REPO: 'jjwprotozoa/ruvoplayer',
    DESKTOP_RELEASES_URL:
        'https://github.com/jjwprotozoa/ruvoplayer/releases/latest',
};
