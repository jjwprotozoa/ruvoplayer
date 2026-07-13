# RuvoPlayer API on Vercel

This document describes how to deploy the PWA backend API from the monorepo
`apps/web-backend` project to Vercel. Use this instead of maintaining the
legacy standalone [ruvoplayer-api](https://github.com/jjwprotozoa/ruvoplayer-api)
repository, which does not include `/stream-proxy`.

## Why deploy from the monorepo

| Concern | Standalone `ruvoplayer-api` repo | Monorepo `apps/web-backend` |
| ------- | -------------------------------- | --------------------------- |
| `/stream-proxy` | Missing (404 in production) | Implemented |
| Shared validation/utils | Duplicated | Uses `@iptvnator/shared/*` |
| Tests | None in monorepo CI | `pnpm nx test web-backend` |
| Docker self-hosted | N/A | Same codebase |

The PWA reads `BACKEND_URL` from `apps/web/src/environments/environment*.ts`
(default: `https://ruvoplayer-api.vercel.app`). Stream URLs are wrapped as:

```text
https://ruvoplayer-api.vercel.app/stream-proxy?url=<encoded-provider-url>
```

Without `/stream-proxy` on Vercel, live/HLS/TS playback fails in the browser
while browsing (parse/xtream) still works.

## Primary + backup deployment

Deploy **two** Vercel projects from the same repository:

| Vercel project | URL | `BACKEND_URL` env |
| -------------- | --- | ----------------- |
| Primary | `https://ruvoplayer-api.vercel.app` | `https://ruvoplayer-api.vercel.app` |
| Backup | `https://ruvoplayer-api-backup.vercel.app` | `https://ruvoplayer-api-backup.vercel.app` |

The PWA failover list is configured in environment files:

```typescript
BACKEND_URL: 'https://ruvoplayer-api.vercel.app',
BACKEND_URL_BACKUP: 'https://ruvoplayer-api-backup.vercel.app',
```

## Vercel project settings

For **each** API project:

1. **Repository**: `jjwprotozoa/ruvoplayer` (this monorepo).
2. **Root Directory**: `apps/web-backend`
3. **Framework Preset**: Other (Vercel reads `apps/web-backend/vercel.json`)
4. **Node.js Version**: 22.x

`vercel.json` in `apps/web-backend` runs:

```bash
cd ../.. && pnpm install --frozen-lockfile   # installCommand
cd ../.. && pnpm nx run web-backend:build:vercel && \
  mkdir -p apps/web-backend/api && \
  cp dist/apps/web-backend/vercel.cjs apps/web-backend/api/index.cjs   # buildCommand
```

The bundled Express app is deployed as a single serverless function with
`maxDuration: 300` seconds for long-lived stream proxy connections.

## Required environment variables

Set these in Vercel → Project → Settings → Environment Variables (Production):

| Variable | Required | Example | Purpose |
| -------- | -------- | ------- | ------- |
| `CLIENT_URL` | Yes | `https://ruvoplayer.vercel.app,http://localhost:4200` | CORS allowed origins (comma-separated) |
| `BACKEND_URL` | Yes | `https://ruvoplayer-api.vercel.app` | Returned by `/config.js`; must match this deployment's public URL |

Optional (development / trusted LAN only):

| Variable | Purpose |
| -------- | ------- |
| `IPTVNATOR_PROXY_ALLOW_PRIVATE_NETWORKS=1` | Allow proxying private/LAN provider URLs |
| `IPTVNATOR_ALLOW_INSECURE_TLS=1` | Allow providers with self-signed TLS certificates |

Do **not** set `IPTVNATOR_PROXY_ALLOW_PRIVATE_NETWORKS` on public production
deployments unless you understand the SSRF risk.

## Migrating an existing Vercel project

If `ruvoplayer-api.vercel.app` currently deploys from
`jjwprotozoa/ruvoplayer-api`:

1. Open the Vercel project settings.
2. Change **Connected Git Repository** to `jjwprotozoa/ruvoplayer`.
3. Set **Root Directory** to `apps/web-backend`.
4. Add/update environment variables above.
5. Redeploy.

The standalone repo can be archived once both primary and backup deployments
pass verification.

## Post-deploy verification

```bash
# Health
curl -s https://ruvoplayer-api.vercel.app/health | jq .

# Endpoint discovery (includes streamProxy)
curl -s https://ruvoplayer-api.vercel.app/ | jq .

# Stream proxy must exist (400/403/502 are OK — 404 means endpoint missing)
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://ruvoplayer-api.vercel.app/stream-proxy?url=http%3A%2F%2Fexample.com%2Ftest.ts"
```

Expected: health `200`, root JSON lists `streamProxy`, stream-proxy **not** `404`.

Repeat for the backup URL.

## Playback notes

- **MKV/VOD**: Proxied over HTTPS and played with ArtPlayer in PWA mode. If the
  browser still cannot decode the container (common in Chrome), use **Open in VLC**
  with the direct provider URL.
- **Live HLS**: Prefer `m3u8` output in portal settings when available.
- **HTTP 458** from providers: Often geo/IP blocking on datacenter IPs (Vercel).
  VLC from the user's home network may still work.

## Related docs

- [`apps/web-backend/README.md`](../../apps/web-backend/README.md) — local dev and endpoint reference
- [`pwa-self-hosted.md`](./pwa-self-hosted.md) — Docker/nginx bundled backend
- [`docker/README.md`](../../docker/README.md) — self-hosted PWA + backend container

## Validation

After changing deployment config:

```bash
pnpm nx test web-backend
pnpm nx run web-backend:build:vercel
```
