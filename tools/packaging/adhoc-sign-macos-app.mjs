#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const outputRoot = path.resolve(workspaceRoot, process.argv[2] ?? 'dist/executables');
const electronBuilderConfig = JSON.parse(
    fs.readFileSync(path.join(workspaceRoot, 'electron-builder.json'), 'utf8')
);
const productName = electronBuilderConfig.productName;
const entitlementsPath = path.join(
    workspaceRoot,
    electronBuilderConfig.mac?.entitlements ??
        'apps/electron-backend/macos/entitlements.mac.plist'
);

const candidates = [
    path.join(outputRoot, 'mac', `${productName}.app`),
    path.join(outputRoot, 'mac-arm64', `${productName}.app`),
];

let signedAny = false;

for (const appPath of candidates) {
    if (!fs.existsSync(appPath)) {
        continue;
    }

    console.log(`Ad-hoc signing ${appPath}`);
    execSync(
        `codesign --sign - --force --deep --options runtime --entitlements ${JSON.stringify(entitlementsPath)} ${JSON.stringify(appPath)}`,
        { stdio: 'inherit' }
    );
    execSync(`codesign --verify --deep --strict ${JSON.stringify(appPath)}`, {
        stdio: 'inherit',
    });
    signedAny = true;
}

if (!signedAny) {
    console.error(`No ${productName}.app bundles found under ${outputRoot}`);
    process.exit(1);
}
