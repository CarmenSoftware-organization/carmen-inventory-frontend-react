---
name: release-and-deploy
description: ใช้เมื่อตัด release (build:bump, changelog) หรือ deploy ขึ้น S3/CloudFront, GCS/Cloud CDN, Docker nginx
---

# ตัด release และ deploy

```bash
bun run build:bump [patch|minor|major]   # ตัด release: bump package.json + generate changelog.json/CHANGELOG.md + commit + annotated tag (local เท่านั้น ไม่ push) — ต้องอยู่บน main, tree สะอาด, ไม่ตามหลัง origin/main ที่ fetch ไว้ (git fetch เองก่อน — สคริปต์ไม่ fetch ให้); gate typecheck+lint+test:run; ไม่ส่ง level = ถามใน terminal
bun scripts/changelog-cli.ts [--rebuild]  # render CHANGELOG.md ใหม่จาก changelog.json (--rebuild = สร้าง changelog.json ใหม่จาก git tag ทับของเดิม)
scripts/setup-gcs-cdn.sh <bucket> <config> [domain]   # One-shot GCP infra (CDN+LB+cert) + first deploy (docs/deploy.md)
scripts/deploy-{s3,gcs,docker}.sh       # Deploy: S3/CloudFront · GCS/Cloud CDN · Docker nginx image (docs/deploy.md)
```

ข้อจำกัดฝั่ง environment ที่มีผลตอน deploy (`SECRET_ENCRYPTION_KEY`, `LICENSE_ENFORCEMENT`,
backend CORS, การเลือก `config.<env>.json`) อยู่ใน `CLAUDE.md` หัวข้อ **Interfaces config**
และ **Known open items** — อ่านที่นั่น อย่าคัดลอกมาไว้ที่นี่
