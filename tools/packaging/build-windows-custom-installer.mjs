import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.dirname(
    path.dirname(path.dirname(fileURLToPath(import.meta.url)))
);
const outputRoot = path.join(workspaceRoot, 'dist', 'executables');
const prepackagedDir = path.join(outputRoot, 'win-unpacked');
const electronBuilderConfigPath = path.join(
    workspaceRoot,
    'electron-builder.json'
);

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function buildWindowsCustomInstallerConfig(baseConfig) {
    const artifactName =
        '${name}-${version}-windows-${arch}-custom-setup.${ext}';

    return {
        ...baseConfig,
        directories: {
            ...baseConfig.directories,
            output: 'dist/executables',
        },
        win: {
            ...baseConfig.win,
            artifactName,
        },
        nsis: {
            ...baseConfig.nsis,
            oneClick: false,
            allowToChangeInstallationDirectory: true,
            allowElevation: true,
            artifactName,
        },
    };
}

function resolvePrepackagedDir(root = outputRoot) {
    const direct = path.join(root, 'win-unpacked');
    if (fs.existsSync(direct)) {
        return direct;
    }

    const nested = fs
        .readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(root, entry.name, 'win-unpacked'))
        .find((candidate) => fs.existsSync(candidate));

    return nested ?? direct;
}

function main() {
    const resolvedPrepackagedDir = resolvePrepackagedDir();
    if (!fs.existsSync(resolvedPrepackagedDir)) {
        throw new Error(
            `Windows prepackaged app not found at ${resolvedPrepackagedDir}. Run pnpm run make:app first.`
        );
    }

    const baseConfig = readJson(electronBuilderConfigPath);
    const customConfig = buildWindowsCustomInstallerConfig(baseConfig);
    const customConfigPath = path.join(
        outputRoot,
        'electron-builder.custom-installer.json'
    );

    fs.mkdirSync(outputRoot, { recursive: true });
    fs.writeFileSync(customConfigPath, `${JSON.stringify(customConfig, null, 4)}\n`);

    execSync(
        [
            'npx',
            'electron-builder',
            '--prepackaged',
            JSON.stringify(resolvedPrepackagedDir),
            '--win',
            'nsis',
            '--config',
            JSON.stringify(customConfigPath),
        ].join(' '),
        {
            cwd: workspaceRoot,
            stdio: 'inherit',
        }
    );
}

const currentFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === currentFilePath) {
    main();
}
