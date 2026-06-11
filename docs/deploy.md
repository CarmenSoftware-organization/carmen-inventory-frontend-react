# Deploy — S3 + CloudFront

## One-time infrastructure setup

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
   Shape (see `public/config.sample.json`):
   ```json
   { "BACKEND_URL": "https://<backend-host>", "X_APP_ID": "<app id>" }
   ```

## Backend prerequisites (see spec §4)

- CORS: allow the CloudFront origin (`https://<distribution-domain>`), methods
  GET/POST/PUT/PATCH/DELETE, headers `Authorization`, `Content-Type`, `x-app-id`.

## Each release

```bash
scripts/deploy-s3.sh <bucket> <distribution-id>
```

`index.html` is no-cache; hashed assets are immutable — returning users pick up
new releases on next navigation.
