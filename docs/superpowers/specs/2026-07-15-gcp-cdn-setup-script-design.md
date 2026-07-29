# GCP Cloud CDN one-shot setup script — design

**Date:** 2026-07-15
**Status:** approved (pending implementation)

## Goal

A single idempotent bash script, `scripts/setup-gcs-cdn.sh`, that provisions the
full production-grade GCP hosting stack for this SPA (GCS bucket → backend bucket
+ Cloud CDN → HTTPS Load Balancer → Google-managed SSL cert) and finishes
end-to-end: initial `config.json` upload, first deploy via the existing
`scripts/deploy-gcs.sh`, and a live HTTPS URL. Re-running the script is always
safe (create-if-missing on every resource).

The manual one-time-setup steps in `docs/deploy.md` §GCP become a single command.

## Non-goals

- Terraform/OpenTofu or any state-managed IaC (explicitly rejected — bash+gcloud
  matches the repo's existing deploy scripts).
- CI/CD automation (possible follow-up, out of scope here).
- Backend CORS configuration (prerequisite owned by the backend team; the script
  prints the exact requirement at the end).
- Multi-environment config files / env-file indirection (YAGNI — positional args
  suffice for the current single environment).

## Interface

```
scripts/setup-gcs-cdn.sh <bucket> <config-file> [domain]
scripts/setup-gcs-cdn.sh <bucket> --teardown
```

- `<bucket>` — GCS bucket name (no `gs://` prefix). Also used as the prefix for
  every derived resource name.
- `<config-file>` — path to the environment's config (e.g. `config.prod.json`,
  gitignored). Uploaded to the bucket as `config.json` **only if the bucket does
  not already have one** (never overwrites, consistent with `deploy-gcs.sh`'s
  guard).
- `[domain]` — optional custom domain for the managed cert. When omitted, the
  script derives `<LB-IP-with-dashes>.sslip.io` from the reserved static IP
  (sslip.io resolves immediately, so the managed cert can provision without any
  DNS setup).
- `--teardown` — deletes the LB/CDN resources in reverse order after a
  confirmation prompt. Does **not** delete the GCS bucket (it holds the
  environment's `config.json` and served files); prints the delete command
  instead.

## Resources and order

All names derive from `<bucket>`:

| # | Resource | Name | Notes |
|---|----------|------|-------|
| 1 | GCS bucket | `<bucket>` | `--uniform-bucket-level-access`; SPA fallback `--web-main-page-suffix=index.html --web-error-page=index.html`; `allUsers` gets `roles/storage.objectViewer` (backend buckets cannot serve private objects; the app itself is auth-gated) |
| 2 | Global static IP | `<bucket>-ip` | reserved first so the sslip.io domain can be derived |
| 3 | Domain | arg or `<ip-dashed>.sslip.io` | — |
| 4 | Managed SSL cert | `<bucket>-cert` | bound to the domain from step 3 |
| 5 | Backend bucket | `<bucket>-backend` | `--enable-cdn --cache-mode=USE_ORIGIN_HEADERS` |
| 6 | URL map | `<bucket>-url-map` | default service → backend bucket; this is the name passed to `deploy-gcs.sh` for invalidation |
| 7 | HTTPS proxy + forwarding rule | `<bucket>-https-proxy`, `<bucket>-https-rule` | port 443, uses the reserved IP |
| 8 | HTTP→HTTPS redirect | `<bucket>-http-redirect-map`, `<bucket>-http-proxy`, `<bucket>-http-rule` | port 80, 301 redirect url-map |

**Why `USE_ORIGIN_HEADERS`:** `deploy-gcs.sh` already sets per-object
`Cache-Control` (assets `public,max-age=31536000,immutable`; `index.html` and
`config.json` `no-cache`). `CACHE_ALL_STATIC` would override the `no-cache` on
`index.html` and break instant releases.

## Flow

1. **Preflight** — verify `gcloud` is authenticated and a project is set
   (`gcloud config get project`); verify `<config-file>` exists and has a
   non-empty `BACKEND_URL`.
2. **Provision** resources 1–8 above. Every resource uses the
   `describe || create` pattern: if it exists, echo "exists, skip"; otherwise
   create it.
3. **Initial `config.json` upload** — only when absent on the bucket
   (`--cache-control="no-cache"`).
4. **First deploy** — call `scripts/deploy-gcs.sh <bucket> <bucket>-url-map`
   (build → rsync → cache headers → CDN invalidation). Runs before the cert is
   ACTIVE; only TLS waits on the cert.
5. **Wait for cert** — poll the managed cert status every 30 s, timeout 40 min.
   On timeout: do not fail; print the status-check command and exit 0.
6. **Summary** — print the site URL (`https://<domain>`), the LB IP, DNS
   instructions (only when a custom domain was passed), and the backend CORS
   prerequisite: allow this origin, methods GET/POST/PUT/PATCH/DELETE, headers
   `Authorization`, `Content-Type`, `x-app-id` (per `docs/deploy.md` shared
   notes).

## Error handling

- `set -euo pipefail` (same as the other deploy scripts) — fail fast; the
  idempotent provision step makes re-running after a failure safe.
- Teardown deletes in reverse order: forwarding rules → proxies → url maps →
  cert → backend bucket → static IP, each with `describe || skip`, after a
  single interactive confirmation.

## Verification

- `bash -n` + `shellcheck` on the script.
- Real-run acceptance (during plan execution, against a real GCP project):
  - site loads over HTTPS at the printed URL;
  - deep SPA route (e.g. `/dashboard`) survives a hard refresh;
  - `/assets/*` responses carry `cache-control: public,max-age=31536000,immutable`;
  - `index.html` response carries `cache-control: no-cache`;
  - `http://` URL 301-redirects to `https://`;
  - re-running the script is a no-op (all "exists, skip").

## Doc updates

- `docs/deploy.md` — replace the GCP manual one-time-setup steps with the new
  script (keep the manual steps as an appendix/reference for what the script
  does).
- `CLAUDE.md` — extend the deploy line in Commands to mention
  `scripts/setup-gcs-cdn.sh`.
