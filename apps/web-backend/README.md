# RuvoPlayer API (`web-backend`)

Browser-only backend proxy for the RuvoPlayer PWA. Handles CORS-safe playlist parsing, Xtream/Stalker API calls, and **stream proxying** for inline playback.

Production deployments:

- Primary: `https://ruvoplayer-api.vercel.app`
- Backup: `https://ruvoplayer-api-backup.vercel.app`

Deploy from **this monorepo** (`apps/web-backend`), not the legacy standalone [ruvoplayer-api](https://github.com/jjwprotozoa/ruvoplayer-api) repository. The monorepo version includes `/stream-proxy`, which the standalone repo is missing.

## Endpoints

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET` | `/health` | Health check |
| `GET` | `/config.js` | Runtime `BACKEND_URL` for self-hosted PWA |
| `POST` | `/provider-targets` | Register a provider URL, returns `targetId` |
| `GET` | `/parse?targetId=<id>` | Parse M3U playlist |
| `GET` | `/xtream?targetId=<id>&...` | Xtream Codes API proxy |
| `GET` | `/stalker?targetId=<id>&...` | Stalker portal proxy |
| `GET` | `/stream-proxy?url=<encoded-url>` | CORS stream proxy for HLS/TS inline playback |

Legacy query param `streamUrl` is also accepted on `/stream-proxy`.

MKV/AVI/WMV/FLV streams are **not** proxied by the PWA client — use **Open in VLC** with the direct provider URL.

## Local development

From the repository root:

```bash
pnpm nx serve web-backend
```

The Angular dev server proxies `/api` to port `3333` (see `apps/web/proxy.conf.json`).

Or run frontend + backend together:

```bash
pnpm run serve:pwa
```

## Deploy to Vercel

Full step-by-step guide: [`docs/architecture/ruvoplayer-api-vercel.md`](../../docs/architecture/ruvoplayer-api-vercel.md)

Quick checklist:

1. Create or reconfigure a Vercel project for this repo.
2. Set **Root Directory** to `apps/web-backend`.
3. Set environment variables (Production):

   | Variable | Example |
   | -------- | ------- |
   | `CLIENT_URL` | `https://ruvoplayer.vercel.app,http://localhost:4200` |
   | `BACKEND_URL` | `https://ruvoplayer-api.vercel.app` |

4. Deploy. Verify:

   ```bash
   curl https://ruvoplayer-api.vercel.app/health
   curl -I "https://ruvoplayer-api.vercel.app/stream-proxy?url=http%3A%2F%2Fexample.com%2Ftest.ts"
   ```

   `/health` should return `200`. `/stream-proxy` should **not** return `404`.

5. Repeat for the backup project (`ruvoplayer-api-backup`) with `BACKEND_URL` set to the backup URL.

## Build artifacts

```bash
pnpm nx run web-backend:build          # local server (main.cjs)
pnpm nx run web-backend:build:vercel    # Vercel bundle (vercel.cjs)
```

## Tests

```bash
pnpm nx test web-backend
pnpm nx lint web-backend
```
