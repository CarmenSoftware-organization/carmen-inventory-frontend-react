# Dev Environment Scripts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `bun run dev:local` / `dev:dev` / `dev:uat` / `dev:prod` scripts that start the Vite dev server against the matching backend environment via `CONFIG_ENV`.

**Architecture:** The dev server already serves a runtime config at `/config.json` through a Vite plugin (`serveLocalConfig` in `vite.config.ts`), currently toggled by the boolean `USE_LOCAL_CONFIG`. This plan generalizes it to `serveEnvConfig()` driven by `CONFIG_ENV=local|dev|uat|prod` → `public/config.<env>.json`, adds the two missing config files (dev, uat), and fails fast on unknown env or missing file. Build (`emitBuildConfig` / `BUILD_CONFIG_FILE`) is untouched.

**Tech Stack:** Bun, Vite 7 (plugin API only — no new dependencies).

**Spec:** `docs/superpowers/specs/2026-07-16-dev-env-scripts-design.md`

## Global Constraints

- No new dependencies.
- `emitBuildConfig()` and `BUILD_CONFIG_FILE` behavior must not change; `bun run build` still emits `dist/config.json` from `config.prod.json` by default.
- `bun dev` must keep today's behavior (serves `config.local.json`).
- The old `prod` script is removed (replaced by `dev:dev`).
- Code comments in `vite.config.ts` are in Thai (match existing file style); commit messages in English.
- All environments call the backend directly — no Vite proxy changes.
- There are no unit tests for the Vite plugin (none exist today); verification is manual via `curl` + expected errors.

---

### Task 1: Environment config files + .gitignore consolidation

**Files:**
- Create: `public/config.dev.json`
- Create: `public/config.uat.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: `public/config.<env>.json` files that Task 2's `serveEnvConfig()` reads by exact filename (`config.local.json` and `config.prod.json` already exist and are not touched).

- [ ] **Step 1: Create `public/config.dev.json`**

Same values as the current `public/config.prod.json` (the "prod" file has always pointed at the dev backend):

```json
{
  "BACKEND_URL": "https://dev.blueledgers.com:4001",
  "X_APP_ID": "9c83fd4b-ce3f-4de2-a522-349ad1280b10",
  "WS_URL": "wss://dev.blueledgers.com:4001/ws"
}
```

- [ ] **Step 2: Create `public/config.uat.json`**

```json
{
  "BACKEND_URL": "https://api-carmen-web.pncsb-app.com",
  "X_APP_ID": "1df7a342-becf-467e-b706-201c6ec22aba",
  "WS_URL": "wss://api-carmen-web.pncsb-app.com/ws"
}
```

Do NOT modify `public/config.prod.json` — it keeps the dev-backend values as a placeholder until a real prod backend exists (per spec).

- [ ] **Step 3: Consolidate .gitignore config entries**

Replace the entire `.gitignore` content. Current content has three per-file config lines plus a duplicated pair at the bottom (`public/config.json`, `public/config.local.json` ×2, `public/config.prod.json` ×2); replace all of them with one glob + one negation. Note `public/config*.json` has no dot after `config` — `config.*.json` would not match the bare `config.json` and would silently un-ignore it:

```
node_modules
dist
public/config*.json
!public/config.sample.json
*.tsbuildinfo
.remember/
test-results/
playwright-report/
.vercel
.env*.local
```

- [ ] **Step 4: Verify ignore behavior**

Run:
```bash
git check-ignore public/config.json public/config.local.json public/config.prod.json public/config.dev.json public/config.uat.json && echo IGNORED-OK
git check-ignore public/config.sample.json || echo SAMPLE-TRACKED-OK
git status --porcelain
```
Expected: `IGNORED-OK` printed (all five paths ignored); `SAMPLE-TRACKED-OK` printed (sample NOT ignored); `git status` shows only ` M .gitignore` — the two new json files must not appear.

- [ ] **Step 5: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore all public/config.*.json except sample"
```

(The two new config files are gitignored by design — nothing else to stage.)

---

### Task 2: `serveEnvConfig()` plugin + `dev:*` scripts

**Files:**
- Modify: `vite.config.ts:7-26` (the `serveLocalConfig` plugin) and `vite.config.ts:51` (plugin registration)
- Modify: `package.json:6-15` (scripts block)

**Interfaces:**
- Consumes: `public/config.<env>.json` files from Task 1.
- Produces: `serveEnvConfig(): Plugin` (replaces `serveLocalConfig`); env var contract `CONFIG_ENV=local|dev|uat|prod` (default `local`); npm scripts `dev`, `dev:local`, `dev:dev`, `dev:uat`, `dev:prod` that Task 3 documents.

- [ ] **Step 1: Replace `serveLocalConfig` with `serveEnvConfig` in `vite.config.ts`**

Replace lines 7–26 (comment block + `serveLocalConfig` function) with:

```ts
// Dev-only: เสิร์ฟ config ตาม CONFIG_ENV ที่ /config.json (runtime fetch /config.json เสมอ)
//   CONFIG_ENV=local|dev|uat|prod (default: local) → public/config.<env>.json
//   ใช้ผ่าน `bun run dev:local` / `dev:dev` / `dev:uat` / `dev:prod`
// ไม่มีผลตอน `vite build` (deploy แยกจัดการ config.json เอง — ดู emitBuildConfig)
const CONFIG_ENVS = ["local", "dev", "uat", "prod"];

function serveEnvConfig(): Plugin {
  const env = process.env.CONFIG_ENV ?? "local";
  if (!CONFIG_ENVS.includes(env)) {
    throw new Error(
      `CONFIG_ENV="${env}" is not a known environment — use one of: ${CONFIG_ENVS.join(", ")}`,
    );
  }
  const file = `config.${env}.json`;
  return {
    name: "serve-env-config",
    apply: "serve", // dev server เท่านั้น — ไม่มีผลตอน `vite build`
    configureServer(server) {
      const target = path.resolve(import.meta.dirname, "public", file);
      // fail fast ตอน start — ไม่งั้นจบเป็น 404 เงียบ + SPA โชว์
      // "Failed to load application configuration"
      if (!fs.existsSync(target)) {
        throw new Error(
          `${target} not found — copy public/config.sample.json to public/${file} and fill in the values`,
        );
      }
      server.middlewares.use("/config.json", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.end(fs.readFileSync(target));
      });
    },
  };
}
```

Then update the plugin registration in `defineConfig` (line 51): `serveLocalConfig(),` → `serveEnvConfig(),`.

Notes for the implementer:
- `fs`, `path`, and `Plugin` are already imported at the top of the file — no import changes.
- Keep `readFileSync` inside the request handler (as today) so edits to the config file are picked up without restarting the server.
- The unknown-env check throws when the plugin factory runs (config load); the missing-file check throws in `configureServer` (server start, dev only) so `vite build` never requires dev config files.

- [ ] **Step 2: Replace the scripts block in `package.json`**

Replace the current scripts (lines 6–15):

```json
  "scripts": {
    "dev": "bun run dev:local",
    "dev:local": "CONFIG_ENV=local vite",
    "dev:dev": "CONFIG_ENV=dev vite",
    "dev:uat": "CONFIG_ENV=uat vite",
    "dev:prod": "CONFIG_ENV=prod vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "lint": "eslint .",
    "clear": "rm -rf dist node_modules"
  },
```

This removes `"dev": "USE_LOCAL_CONFIG=1 vite"` and `"prod": "vite"` (replaced by `dev:local` / `dev:dev`). `USE_LOCAL_CONFIG` no longer appears anywhere in the repo after this step — confirm with `grep -r USE_LOCAL_CONFIG . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist` (expect: matches only in `docs/superpowers/` spec/plan history, none in code).

- [ ] **Step 3: Verify each env serves its config**

For each env, start the server, curl, compare, stop. Run one at a time (port 3000):

```bash
for e in local dev uat prod; do
  bun run dev:$e >/dev/null 2>&1 &
  PID=$!
  sleep 3
  echo "--- $e ---"
  curl -s http://localhost:3000/config.json | diff - public/config.$e.json && echo MATCH
  kill $PID
  sleep 1
done
```
Expected: `MATCH` printed for all four envs, no diff output.

Also verify the default alias:
```bash
bun dev >/dev/null 2>&1 & PID=$!; sleep 3
curl -s http://localhost:3000/config.json | diff - public/config.local.json && echo DEFAULT-OK
kill $PID
```
Expected: `DEFAULT-OK`.

- [ ] **Step 4: Verify fail-fast paths**

Unknown env (bypasses the scripts, sets the var directly):
```bash
CONFIG_ENV=bogus bunx vite 2>&1 | grep 'not a known environment'
```
Expected: error line `CONFIG_ENV="bogus" is not a known environment — use one of: local, dev, uat, prod`; server does not start.

Missing file:
```bash
mv public/config.uat.json public/config.uat.json.bak
bun run dev:uat 2>&1 | grep 'config.sample.json'
mv public/config.uat.json.bak public/config.uat.json
```
Expected: error mentioning the missing path and the hint to copy `config.sample.json`; server does not start. File restored afterwards.

- [ ] **Step 5: Verify build is untouched**

```bash
bun run build
diff dist/config.json public/config.prod.json && echo BUILD-OK
```
Expected: build succeeds; `BUILD-OK` (dist config still comes from `config.prod.json` via `emitBuildConfig`).

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts package.json
git commit -m "feat(dev): CONFIG_ENV-driven dev scripts (dev:local/dev/uat/prod)"
```

---

### Task 3: Documentation + final verification

**Files:**
- Modify: `CLAUDE.md` (Commands section, lines 13–14 of the code block)

**Interfaces:**
- Consumes: script names from Task 2 (`dev`, `dev:local`, `dev:dev`, `dev:uat`, `dev:prod`).
- Produces: nothing downstream — docs only.

- [ ] **Step 1: Update CLAUDE.md Commands section**

Replace the line:

```
bun dev              # Dev server (VITE_DEV_PROXY_TARGET=<backend> to proxy /api)
```

with:

```
bun dev              # Dev server = dev:local (VITE_DEV_PROXY_TARGET=<backend> to proxy /api)
bun run dev:{local,dev,uat,prod}   # Dev server per backend env → public/config.<env>.json (prod = dev backend until real prod exists)
```

- [ ] **Step 2: Run the full test suite and lint**

```bash
bun test:run && bun run lint
```
Expected: all tests pass, lint clean (no source-under-test changed, but confirm nothing referenced the removed scripts).

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document dev:local/dev/uat/prod scripts"
```
