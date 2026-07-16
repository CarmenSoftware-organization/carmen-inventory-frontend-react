#!/usr/bin/env bash
# Deploy SPA ไป S3 + invalidate CloudFront
# Usage: scripts/deploy-s3.sh <s3-bucket> <cloudfront-distribution-id>
# หมายเหตุ: config.json จัดการแยกต่อ environment — ห้าม sync ทับ
set -euo pipefail

BUCKET="${1:?Usage: deploy-s3.sh <bucket> <distribution-id>}"
DISTRIBUTION_ID="${2:?Usage: deploy-s3.sh <bucket> <distribution-id>}"

bun run build

# Guard: remove dev config files from dist so they can never be uploaded,
# even if someone edits the --exclude flags below.
# (vite copies public/ into dist/, which includes config.json + every
# config.<env>.json / config.sample.json)
rm -f dist/config*.json

# Hashed assets — cache ยาว (immutable)
# --delete: removes files from the bucket that are no longer in dist/.
# --exclude config*.json: this pattern is excluded from the sync entirely —
#   aws s3 sync treats excluded files as invisible, so --delete will NOT
#   remove them from the destination bucket. The env's config.json that
#   lives on the bucket is therefore safe.
aws s3 sync dist/ "s3://${BUCKET}/" \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html" \
  --exclude "config*.json"

# index.html — no-cache เพื่อให้ deploy ใหม่มีผลทันที
aws s3 cp dist/index.html "s3://${BUCKET}/index.html" \
  --cache-control "no-cache"

# config.json บน bucket เป็นของ environment นั้นๆ — อัปโหลดครั้งแรกด้วยมือ:
#   aws s3 cp config.<env>.json s3://<bucket>/config.json --cache-control "no-cache"

aws cloudfront create-invalidation \
  --distribution-id "${DISTRIBUTION_ID}" \
  --paths "/index.html"

echo "Deployed to s3://${BUCKET} and invalidated /index.html"
