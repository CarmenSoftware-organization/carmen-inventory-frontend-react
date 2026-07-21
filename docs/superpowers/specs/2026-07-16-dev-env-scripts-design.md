# Dev Environment Scripts (`dev:local` / `dev:dev` / `dev:uat` / `dev:prod`)

**Date:** 2026-07-16
**Status:** Approved

## Problem

The dev server can only serve two runtime configs, chosen by a boolean:

- `bun dev` (`USE_LOCAL_CONFIG=1`) → `public/config.local.json` (localhost:4000)
- `bun run prod` → `public/config.prod.json` — which actually points at the **dev**
  backend (`dev.blueledgers.com:4001`), not production

We now have four backend environments (local / dev / uat / prod) and need one
script per environment.

## Environments

| env   | BACKEND_URL                            | X_APP_ID       | WS_URL                                    |
| ----- | -------------------------------------- | -------------- | ----------------------------------------- |
| local | `http://localhost:4000`                | `9c83fd4b-...` | `ws://localhost:4000/ws`                  |
| dev   | `https://dev.blueledgers.com:4001`     | `9c83fd4b-...` | `wss://dev.blueledgers.com:4001/ws`       |
| uat   | `https://api-carmen-web.pncsb-app.com` | `1df7a342-...` | `wss://api-carmen-web.pncsb-app.com/ws`   |
| prod  | same as dev (real prod backend TBD — placeholder until it exists) | `9c83fd4b-...` | same as dev |

All environments are called **directly** from the browser (no Vite proxy). The
dev backend already works this way today via `bun run prod`; if uat hits CORS,
that is fixed backend-side (or revisited later), not in this design.

## Design

### 1. package.json scripts

```json
"dev": "bun run dev:local",
"dev:local": "CONFIG_ENV=local vite",
"dev:dev": "CONFIG_ENV=dev vite",
"dev:uat": "CONFIG_ENV=uat vite",
"dev:prod": "CONFIG_ENV=prod vite"
```

- `dev` stays the default and aliases `dev:local` (current behavior preserved).
- The old `prod` script is **removed** — `dev:dev` replaces it (that is where it
  actually pointed).

### 2. vite.config.ts plugin

Rename `serveLocalConfig()` → `serveEnvConfig()`:

- Read `CONFIG_ENV`, default `"local"`.
- Validate against `local | dev | uat | prod`; unknown value → **throw at config
  load** with a message listing valid values (fail fast).
- Serve `public/config.<env>.json` at `/config.json` (dev server only, as today).
- Missing config file → **throw at server start** with the expected path and a
  hint to copy `config.sample.json`. Replaces the old silent `next()` fallthrough
  that ended in a 404 and the SPA showing "Failed to load application
  configuration".
- `emitBuildConfig()` and `BUILD_CONFIG_FILE` are untouched — build and CI
  behavior do not change.

### 3. Config files (`public/`)

- `config.local.json` — unchanged.
- `config.dev.json` — **new**; takes the current `config.prod.json` values
  (dev.blueledgers.com:4001).
- `config.uat.json` — **new**; uat values from the table above.
- `config.prod.json` — keeps dev values for now (placeholder until the real
  prod backend exists).

### 4. .gitignore

Replace the two per-file config entries (and the duplicated pair at the bottom)
with:

```
public/config*.json
!public/config.sample.json
```

Covers `config.json`, `config.local.json`, `config.prod.json`, and the new
`config.dev.json` / `config.uat.json`; only the sample stays committed. Note the
glob has no dot after `config` — `config.*.json` would not match the bare
`config.json`.

### 5. Docs

Update CLAUDE.md Commands section: `bun dev` / `bun run dev:{local,dev,uat,prod}`,
with a note that `dev:prod` points at the dev backend until a real prod backend
exists.

### 6. Verification

No unit tests for the Vite plugin (none exist today). Manual verification:

- Start each env, `curl http://localhost:3000/config.json`, compare values.
- `CONFIG_ENV=bogus` → clear error listing valid envs.
- Missing config file → clear error with path + sample hint.
- `bun run build` still emits `dist/config.json` from `config.prod.json`.

## Out of scope

- Vite proxy mode for remote envs (`VITE_DEV_PROXY_TARGET` stays as-is, orthogonal).
- Build/deploy config selection (`BUILD_CONFIG_FILE`) — unchanged.
- Real prod backend URL — fill into `config.prod.json` when it exists.
