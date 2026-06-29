# RuvoPlayer macOS Desktop Releases

This document covers macOS packaging, Gatekeeper behavior, and Apple signing setup for the [jjwprotozoa/ruvoplayer](https://github.com/jjwprotozoa/ruvoplayer) fork.

## Current packaging identity

| Setting | Value |
|---------|-------|
| App name | `RuvoPlayer.app` |
| Bundle ID | `com.ruvoplayer.desktop` |
| Artifact pattern | `RuvoPlayer-${version}-${os}-${arch}.dmg` |
| Production branch | `ruvo-branding` |

## Unsigned builds (current default on the fork)

GitHub Actions builds on `ruvo-branding` and version tags without Apple Developer credentials. Those builds are **ad-hoc signed** but **not notarized**.

After downloading from Safari, macOS may show:

> **"RuvoPlayer" is damaged and can't be opened.**

That is Gatekeeper reacting to the quarantine flag on unsigned downloads. The app is not corrupted.

### User workaround

```bash
xattr -cr /Applications/RuvoPlayer.app
open /Applications/RuvoPlayer.app
```

Or right-click the app → **Open** once.

Release notes for each version should include the command above until notarized builds ship.

## Notarized builds (recommended next step)

Add these **GitHub repository secrets** on `jjwprotozoa/ruvoplayer`:

| Secret | Purpose |
|--------|---------|
| `CSC_LINK` | Base64-encoded `.p12` Developer ID Application certificate |
| `CSC_KEY_PASSWORD` | Password for the `.p12` export |

And **one** notarization method:

**Option A — App Store Connect API key (preferred)**

| Secret | Purpose |
|--------|---------|
| `APPLE_API_KEY` | Contents of the `.p8` API key file |
| `APPLE_API_KEY_ID` | Key ID |
| `APPLE_API_ISSUER` | Issuer ID |

**Option B — Apple ID**

| Secret | Purpose |
|--------|---------|
| `APPLE_ID` | Apple ID email |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | Team ID |

Also set repository **variable**:

| Variable | Example |
|----------|---------|
| `CSC_NAME` | `Developer ID Application: Your Name (TEAMID)` |

When these secrets exist, CI on the upstream repo path (`4gray/iptvnator`) already validates signing and notarizes release builds. To enable the same on the RuvoPlayer fork, extend the workflow `if:` conditions from `github.repository == '4gray/iptvnator'` to also allow `jjwprotozoa/ruvoplayer` once secrets are configured.

## Local macOS build (unsigned)

```bash
pnpm nx build web --configuration=production
pnpm run build:backend
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('electron-builder.json', 'utf8'));
pkg.mac.target.arch = ['arm64'];
pkg.mac.forceCodeSigning = false;
pkg.mac.notarize = false;
fs.writeFileSync('electron-builder.json', JSON.stringify(pkg, null, 4) + '\n');
"
CSC_IDENTITY_AUTO_DISCOVERY=false IPTVNATOR_REQUIRE_EMBEDDED_MPV=0 pnpm run make:app
pnpm run sign:macos-adhoc
git checkout -- electron-builder.json
```

Output: `dist/executables/RuvoPlayer-0.22.0-mac-arm64.dmg`

## CI workflow

- Branch/tag triggers: `ruvo-branding`, `v*.*.*`
- Fork macOS path: unsigned electron-builder + `tools/packaging/adhoc-sign-macos-app.mjs`
- Tagged releases publish as **non-draft** when the build matrix succeeds

## PWA download link

The PWA Settings → About card links to `https://github.com/jjwprotozoa/ruvoplayer/releases/latest`, configured via `DESKTOP_RELEASES_URL` in environment/runtime config.
