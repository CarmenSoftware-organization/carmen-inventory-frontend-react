#!/usr/bin/env bash
# Deploy SPA ไป Google Cloud Storage (+ invalidate Cloud CDN ถ้าระบุ URL map)
# Usage: scripts/deploy-gcs.sh <gcs-bucket> [cdn-url-map]
#   <gcs-bucket>   ชื่อ bucket (ไม่ต้องมี gs:// นำหน้า)
#   [cdn-url-map]  (optional) ชื่อ URL map ของ HTTPS LB — ถ้าให้มา จะ invalidate /index.html
# หมายเหตุ: config.json จัดการแยกต่อ environment — ห้าม sync ทับ (ดู docs/deploy.md)
set -euo pipefail

BUCKET="${1:?Usage: deploy-gcs.sh <bucket> [cdn-url-map]}"
URL_MAP="${2:-}"

bun run build

# Guard: ลบ dev config ออกจาก dist กันหลุดขึ้น bucket
# (vite copies public/ เข้า dist/ ซึ่งรวม config.json และ config.sample.json)
rm -f dist/config.json dist/config.sample.json

# Sync ทุกอย่างยกเว้น index.html / config*.json
# --exclude เป็น regex และไฟล์ที่ exclude จะ "มองไม่เห็น" ทั้งสองฝั่ง —
# --delete-unmatched-destination-objects จึงไม่ลบ config.json ของ environment บน bucket
gcloud storage rsync dist "gs://${BUCKET}" \
  --recursive \
  --delete-unmatched-destination-objects \
  --exclude="^index\.html$|^config\.json$|^config\.sample\.json$"

# Hashed assets — cache ยาว (immutable; ชื่อไฟล์มี hash เปลี่ยนทุก build อยู่แล้ว)
gcloud storage objects update "gs://${BUCKET}/assets/**" \
  --cache-control="public,max-age=31536000,immutable"

# index.html — no-cache เพื่อให้ deploy ใหม่มีผลทันที
gcloud storage cp dist/index.html "gs://${BUCKET}/index.html" \
  --cache-control="no-cache"

# config.json บน bucket เป็นของ environment นั้นๆ — อัปโหลดครั้งแรกด้วยมือ:
#   gcloud storage cp config.<env>.json gs://<bucket>/config.json --cache-control="no-cache"

# Invalidate Cloud CDN เฉพาะเมื่อ deploy อยู่หลัง HTTPS LB + Cloud CDN
if [ -n "${URL_MAP}" ]; then
  gcloud compute url-maps invalidate-cdn-cache "${URL_MAP}" --path "/index.html"
  echo "Deployed to gs://${BUCKET} and invalidated /index.html on ${URL_MAP}"
else
  echo "Deployed to gs://${BUCKET} (no CDN invalidation — index.html is no-cache)"
fi
