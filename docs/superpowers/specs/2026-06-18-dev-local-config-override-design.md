# Dev-only local runtime config override

**Date:** 2026-06-18
**Status:** Approved design

## Problem

Runtime config is fetched at boot from `/config.json` (`lib/runtime-config.ts:17`).
`public/config.json` is gitignored and acts as each machine's active config. A second
file, `public/config.local.json`, already exists (pointing at `http://localhost:4000`)
but nothing reads it.

The goal is **developer convenience only**: `bun dev` should automatically use
`config.local.json` when present, without overwriting `config.json` and without
leaking any dev logic into the production bundle.

## Scope

- **In scope:** dev server (`bun dev` / `vite serve`) only.
- **Out of scope:** production `bun run build`, deploy scripts, runtime code shipped
  in the bundle. No changes to `lib/runtime-config.ts`, `main.tsx`, or any app code.

## Approach (selected: Vite dev middleware)

Add an inline Vite plugin in `vite.config.ts` that intercepts requests for
`/config.json` on the dev server. If `public/config.local.json` exists, serve its
contents; otherwise call `next()` so Vite serves the real `public/config.json` as
usual.

### Why not the alternatives

- **Copy script (`config.local.json` → `config.json`):** rejected — overwrites
  `config.json`, violating the "don't touch config.json" requirement.
- **Branch inside `runtime-config.ts`:** rejected — ships dev-only fetch logic
  (and a spurious 404 attempt) into the production bundle.

## Design

Inline plugin in `vite.config.ts`:

```ts
import fs from "node:fs";
import type { Plugin } from "vite";

function serveLocalConfig(): Plugin {
  return {
    name: "serve-local-config",
    apply: "serve", // dev server only — excluded from `vite build`
    configureServer(server) {
      server.middlewares.use("/config.json", (_req, res, next) => {
        const local = path.resolve(import.meta.dirname, "public/config.local.json");
        if (!fs.existsSync(local)) return next();
        res.setHeader("Content-Type", "application/json");
        res.end(fs.readFileSync(local));
      });
    },
  };
}
```

Register it in the `plugins` array of the existing `defineConfig`.

### Behaviour

| Situation | Result |
|---|---|
| `bun dev`, `config.local.json` present | `/config.json` returns the local file contents (e.g. `localhost:4000`) |
| `bun dev`, `config.local.json` absent | Falls through to `public/config.json` (current behaviour) |
| `bun run build` | Plugin inert (`apply: "serve"`); no effect on the static bundle |

No change to `lib/runtime-config.ts` — it still fetches `/config.json` and is
unaware of the override.

## Verification

1. With `public/config.local.json` present, run `bun dev`; open DevTools → Network →
   confirm `/config.json` response body matches `config.local.json` (BACKEND_URL
   `http://localhost:4000`).
2. Temporarily rename `config.local.json`; reload `bun dev`; confirm `/config.json`
   serves `public/config.json` instead.
3. `bun run build` succeeds and `dist/config.json` is unaffected by the plugin.
4. `bun run lint` and `bunx tsc --noEmit` clean.

## Notes / open items

- `config.local.json` stays untracked (it is not in `.gitignore` but is not committed);
  no change to git tracking is needed. Optionally add `public/config.local.json` to
  `.gitignore` to make the intent explicit — decided during implementation.
