# Deploy — static SPA hosting

Two supported targets: **AWS S3 + CloudFront** and **Google Cloud Storage (+ Cloud CDN)**.
Both share the same model: one immutable build artifact; the per-environment
`config.json` lives on the bucket (never in the bundle); `index.html` is no-cache.

---

## AWS — S3 + CloudFront

### One-time infrastructure setup

1. **S3 bucket** (private, no static-website mode needed):
   - Block all public access: ON
2. **CloudFront distribution**:
   - Origin: the S3 bucket via **Origin Access Control (OAC)**; update the bucket
     policy with the generated statement.
   - Default root object: `index.html`
   - **Custom error responses** (SPA client-side routing):
     - HTTP 403 → response page `/index.html`, response code 200
     - HTTP 404 → response page `/index.html`, response code 200
   - Viewer protocol policy: redirect HTTP → HTTPS
3. **Per-environment `config.json`** — upload once per environment:
   ```bash
   aws s3 cp config.uat.json s3://<bucket>/config.json --cache-control "no-cache"
   ```

### Each release

```bash
scripts/deploy-s3.sh <bucket> <distribution-id>
```

---

## GCP — Cloud Storage (+ optional Cloud CDN)

### One-time infrastructure setup

1. **GCS bucket**:
   ```bash
   gcloud storage buckets create gs://<bucket> --location=<region> --uniform-bucket-level-access
   ```
2. **SPA fallback** — serve `index.html` for unknown paths (client-side routing):
   ```bash
   gcloud storage buckets update gs://<bucket> \
     --web-main-page-suffix=index.html --web-error-page=index.html
   ```
   Note: behind a load-balancer backend bucket, unknown paths return the
   `index.html` BODY with HTTP status 404 — the SPA still boots and routes
   correctly (the app is auth-gated, so the status code has no SEO impact).
3. **Choose exposure**:
   - **Public bucket website** (simplest): grant `roles/storage.objectViewer` to
     `allUsers` and serve via `https://storage.googleapis.com/<bucket>/index.html`
     or a CNAME — fine for UAT.
   - **HTTPS Load Balancer + Cloud CDN** (production): backend bucket → enable
     Cloud CDN → HTTPS frontend with managed cert. Pass the LB's URL-map name to
     the deploy script so `/index.html` gets invalidated on each release.
4. **Per-environment `config.json`** — upload once per environment:
   ```bash
   gcloud storage cp config.uat.json gs://<bucket>/config.json --cache-control="no-cache"
   ```

### Each release

```bash
scripts/deploy-gcs.sh <bucket>              # bucket-only (no CDN)
scripts/deploy-gcs.sh <bucket> <url-map>    # behind HTTPS LB + Cloud CDN
```

---

## Docker — nginx + built-in /api proxy

The image serves the static bundle with nginx and **proxies `/api/*` to the backend
inside the container** (same model as the original Next server) — so the backend
needs **no CORS** for Docker deployments. `config.json` is rendered from env at
container start (`BACKEND_URL` in it stays `""` = same-origin).

### Build / push

```bash
scripts/deploy-docker.sh                 # build, tag = git short SHA + latest
scripts/deploy-docker.sh v1.0.0 <registry>   # build + push (e.g. ECR/GCR/Docker Hub)
```

### Run

```bash
docker run -d -p 3000:80 \
  -e BACKEND_URL=https://<backend-host> \
  -e X_APP_ID=<app id> \
  -e WS_URL=wss://<backend-host>/ws \
  carmen-inventory-frontend-react:latest
# หรือ: BACKEND_URL=.. X_APP_ID=.. docker compose up -d --build
```

Runtime env:

| Var | Required | Meaning |
|---|---|---|
| `BACKEND_URL` | yes | backend origin the nginx `/api/*` proxy targets |
| `X_APP_ID` | yes | rendered into `config.json` |
| `WS_URL` | no | rendered into `config.json` (notifications) |
| `PROXY_SSL_VERIFY` | no (default `on`) | set `off` ONLY for UAT self-signed backends — never in production; prefer adding the CA to the trust store |

Endpoints: `/healthz` (used by the image HEALTHCHECK), SPA fallback for all
non-file paths, immutable caching on `/assets/*`, no-cache on `index.html` +
`config.json`.

---

## Shared notes

- `config.json` shape (see `public/config.sample.json`):
  ```json
  { "BACKEND_URL": "https://<backend-host>", "X_APP_ID": "<app id>", "WS_URL": "wss://<backend-host>/ws" }
  ```
- **Backend prerequisite for S3/GCS (see spec §4)** — CORS: allow the CDN/bucket origin,
  methods GET/POST/PUT/PATCH/DELETE, headers `Authorization`, `Content-Type`,
  `x-app-id`. (The Docker target is exempt — its nginx proxies `/api/*` same-origin.)
- `index.html` is no-cache; hashed assets are immutable — returning users pick up
  new releases on next navigation.
- Both deploy scripts delete the dev `config.json` from `dist/` before syncing and
  exclude `config.json` from the sync, so the environment's config on the bucket
  is never overwritten.
