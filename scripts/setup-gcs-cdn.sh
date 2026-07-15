#!/usr/bin/env bash
# One-shot setup: GCS bucket + Cloud CDN + HTTPS LB + Google-managed cert สำหรับ SPA นี้
# Usage:
#   scripts/setup-gcs-cdn.sh <bucket> <config-file> [domain]   provision + first deploy
#   scripts/setup-gcs-cdn.sh <bucket> --teardown               ลบ LB/CDN (เก็บ bucket ไว้)
# ไม่ให้ [domain] มา = ใช้ <LB-IP>.sslip.io อัตโนมัติ (managed cert ออกได้โดยไม่ต้องมี DNS)
# ENV: GCS_LOCATION (default asia-southeast1) — ใช้ตอนสร้าง bucket ครั้งแรกเท่านั้น
# Spec: docs/superpowers/specs/2026-07-15-gcp-cdn-setup-script-design.md
set -euo pipefail

usage() {
  cat >&2 <<'EOF'
Usage:
  setup-gcs-cdn.sh <bucket> <config-file> [domain]   provision + first deploy
  setup-gcs-cdn.sh <bucket> --teardown               delete LB/CDN resources (keeps bucket)
EOF
  exit 1
}

log() { echo "[setup-gcs-cdn] $*"; }

BUCKET="${1:-}"; [ -n "${BUCKET}" ] || usage
MODE=setup
CONFIG_FILE=""
DOMAIN=""
case "${2:-}" in
  --teardown) MODE=teardown ;;
  "") usage ;;
  *) CONFIG_FILE="$2"; DOMAIN="${3:-}" ;;
esac
CUSTOM_DOMAIN=false; [ -z "${DOMAIN}" ] || CUSTOM_DOMAIN=true

LOCATION="${GCS_LOCATION:-asia-southeast1}"
IP_NAME="${BUCKET}-ip"
CERT_NAME="${BUCKET}-cert"
BACKEND_NAME="${BUCKET}-backend"
URL_MAP="${BUCKET}-url-map"
HTTPS_PROXY="${BUCKET}-https-proxy"
HTTPS_RULE="${BUCKET}-https-rule"
REDIRECT_MAP="${BUCKET}-http-redirect-map"
HTTP_PROXY="${BUCKET}-http-proxy"
HTTP_RULE="${BUCKET}-http-rule"

# ---- preflight ----
command -v gcloud >/dev/null 2>&1 \
  || { log "gcloud not found — install: brew install --cask google-cloud-sdk"; exit 1; }
ACTIVE_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null || true)"
[ -n "${ACTIVE_ACCOUNT}" ] || { log "no active gcloud account — run: gcloud auth login"; exit 1; }
PROJECT="$(gcloud config get-value project 2>/dev/null || true)"
{ [ -n "${PROJECT}" ] && [ "${PROJECT}" != "(unset)" ]; } \
  || { log "no project set — run: gcloud config set project <project-id>"; exit 1; }
log "project: ${PROJECT} (account: ${ACTIVE_ACCOUNT})"

if [ "${MODE}" = "setup" ]; then
  [ -f "${CONFIG_FILE}" ] || { log "config file not found: ${CONFIG_FILE}"; exit 1; }
  BACKEND_URL_VAL="$(bun -e 'const c=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(c.BACKEND_URL??""))' "${CONFIG_FILE}")"
  [ -n "${BACKEND_URL_VAL}" ] || { log "BACKEND_URL missing/empty in ${CONFIG_FILE}"; exit 1; }
fi
