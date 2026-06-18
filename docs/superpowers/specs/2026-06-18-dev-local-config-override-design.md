# Dev local/prod runtime config override

**Date:** 2026-06-18
**Status:** Implemented

## Problem

Runtime config is fetched at boot from `/config.json` (`lib/runtime-config.ts:17`).
For local development we want to switch between two backends without editing files by
hand:

- a **local** backend (`http://localhost:4000`)
- a **remote** backend (the per-developer dev/UAT gateway)

The goal is developer convenience only — two explicit dev-server commands, no manual
file copying, and no dev logic leaking into the production bundle.

## Scope

- **In scope:** the Vite dev server (`vite serve`) only — `bun run dev` and
  `bun run prod`. Both are the same dev server on port 3000; they differ only in which
  config file is served at `/config.json`.
- **Out of scope:** production `bun run build`, deploy scripts, runtime code shipped in
  the bundle. No change to `lib/runtime-config.ts`, `main.tsx`, or any app code.

## Key fact — production is unaffected

`public/config.json` is **never shipped** to production. Every deploy path removes
`dist/config.json` and supplies the real config per environment:

- `scripts/deploy-s3.sh` / `scripts/deploy-gcs.sh` — `rm -f dist/config.json`; the
  bucket holds the environment's own `config.json` (uploaded once, see `docs/deploy.md`).
- `Dockerfile` — `rm -f public/config.json … dist/config.json`; the container renders
  `config.json` from env at startup (`docker/40-render-config-json.sh`).

So the dev config files are purely local and renaming them has no deploy impact.

## File layout

| File | Purpose | Git |
|---|---|---|
| `public/config.local.json` | local backend config (`localhost:4000`) | gitignored |
| `public/config.prod.json` | remote backend config | gitignored |
| `public/config.sample.json` | committed template / shape reference | tracked |

(`public/config.json` is removed from local dev; the name now only refers to the
per-environment file produced at deploy time.)

## Approach (selected: Vite dev middleware + npm scripts)

An inline Vite plugin in `vite.config.ts` (`apply: "serve"`) intercepts `/config.json`
on the dev server and serves one of the two files based on the `USE_LOCAL_CONFIG`
environment variable. The two npm scripts set the flag:

```jsonc
"dev":  "USE_LOCAL_CONFIG=1 vite",  // serves config.local.json
"prod": "vite",                     // serves config.prod.json
```

### Why not the alternatives

- **Auto-detect file existence:** rejected — implicit; the developer can't choose which
  backend without renaming files.
- **Copy script (`config.*.json` → `config.json`):** rejected — mutates a config file
  on every run, easy to commit by accident.
- **Branch inside `runtime-config.ts`:** rejected — ships dev-only fetch logic into the
  production bundle.

## Design

```ts
function serveLocalConfig(): Plugin {
  const file =
    process.env.USE_LOCAL_CONFIG === "1" ? "config.local.json" : "config.prod.json";
  return {
    name: "serve-local-config",
    apply: "serve", // dev server only — inert during `vite build`
    configureServer(server) {
      server.middlewares.use("/config.json", (_req, res, next) => {
        const target = path.resolve(import.meta.dirname, "public", file);
        if (!fs.existsSync(target)) return next();
        res.setHeader("Content-Type", "application/json");
        res.end(fs.readFileSync(target));
      });
    },
  };
}
```

Registered first in the `plugins` array. `lib/runtime-config.ts` is unchanged — it still
fetches `/config.json` and is unaware of the override.

### Behaviour

| Command | `/config.json` serves | If file missing |
|---|---|---|
| `bun run dev` | `public/config.local.json` | `next()` → Vite static (404 if absent) |
| `bun run prod` | `public/config.prod.json` | `next()` → Vite static (404 if absent) |
| `bun run build` | — | plugin inert (`apply: "serve"`) |

## Verification

1. `bun run dev` → `GET /config.json` returns `config.local.json`
   (`BACKEND_URL: http://localhost:4000`). ✅
2. `bun run prod` → `GET /config.json` returns `config.prod.json`
   (remote `BACKEND_URL`). ✅
3. `bunx tsc --noEmit` and `bun run lint` clean (0 errors). ✅
4. Deploy paths untouched — they already strip `dist/config.json`.

## Changes

- `public/config.json` → `public/config.prod.json` (rename).
- `vite.config.ts` — add `serveLocalConfig()` plugin.
- `package.json` — `dev` sets `USE_LOCAL_CONFIG=1`; add `prod` script.
- `.gitignore` — ignore `config.local.json` and `config.prod.json` (in addition to the
  legacy `config.json`).
