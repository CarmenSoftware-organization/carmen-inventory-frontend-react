# carmen-inventory-frontend-react

Vite + React Router SPA port of [carmen-inventory-frontend](../carmen-inventory-frontend)
(ERP inventory system), built for static hosting on S3 + CloudFront.

## Quickstart

```bash
bun install
cp public/config.sample.json public/config.json   # set X_APP_ID; BACKEND_URL="" for proxy mode
VITE_DEV_PROXY_TARGET=https://<backend> bun dev
```

- Spec: `docs/superpowers/specs/2026-06-11-carmen-react-ssg-migration-design.md`
- Phase 0 plan: `docs/superpowers/plans/2026-06-11-phase0-foundation.md`
- Deploy: `docs/deploy.md`
