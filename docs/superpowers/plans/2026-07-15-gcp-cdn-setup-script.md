# GCP Cloud CDN Setup Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One idempotent bash script `scripts/setup-gcs-cdn.sh` that provisions GCS bucket + Cloud CDN + HTTPS LB + Google-managed cert (sslip.io fallback domain) and finishes with the first deploy — plus `--teardown` and doc updates.

**Architecture:** Single script following the repo's existing `scripts/deploy-*.sh` pattern (bash, `set -euo pipefail`, Thai comments OK). Every GCP resource uses `describe || create` so re-runs are no-ops. The script ends by delegating to the existing `scripts/deploy-gcs.sh <bucket> <url-map>`.

**Tech Stack:** bash, gcloud CLI, bun (JSON parsing in preflight), shellcheck (lint).

**Spec:** `docs/superpowers/specs/2026-07-15-gcp-cdn-setup-script-design.md` — read it before starting any task.

## Global Constraints

- Script path: `scripts/setup-gcs-cdn.sh`, mode `chmod +x`, `set -euo pipefail`.
- Resource names derive from `<bucket>`: `<bucket>-ip`, `<bucket>-cert`, `<bucket>-backend`, `<bucket>-url-map`, `<bucket>-https-proxy`, `<bucket>-https-rule`, `<bucket>-http-redirect-map`, `<bucket>-http-proxy`, `<bucket>-http-rule`.
- Cloud CDN cache mode MUST be `USE_ORIGIN_HEADERS` (never `CACHE_ALL_STATIC` — would break `index.html` no-cache).
- `config.json` on the bucket is NEVER overwritten (upload only when absent).
- Teardown NEVER deletes the GCS bucket.
- Every task: `bash -n scripts/setup-gcs-cdn.sh` and `shellcheck scripts/setup-gcs-cdn.sh` must pass before commit.
- Commit messages in English, conventional-commit style.

---

### Task 1: Install tooling (shellcheck + gcloud CLI)

**Files:** none (machine setup only — nothing committed).

**Interfaces:**
- Produces: working `shellcheck` and `gcloud` binaries on PATH for all later tasks.

- [ ] **Step 1: Install shellcheck**

```bash
brew install shellcheck
```

- [ ] **Step 2: Verify shellcheck**

Run: `shellcheck --version`
Expected: prints `version: 0.x`

- [ ] **Step 3: Install gcloud CLI**

```bash
brew install --cask google-cloud-sdk
```

- [ ] **Step 4: Verify gcloud**

Run: `gcloud --version`
Expected: prints `Google Cloud SDK 4xx.x.x`. If the shell can't find it, open a new shell or `source "$(brew --prefix)/share/google-cloud-sdk/path.zsh.inc"`.

Note: `gcloud auth login` / `gcloud config set project` are NOT done here — they are interactive and belong to Task 7 (real-run), where the user runs them.

---

### Task 2: Script skeleton — usage, arg parsing, resource names, preflight

**Files:**
- Create: `scripts/setup-gcs-cdn.sh`

**Interfaces:**
- Produces: variables `BUCKET`, `MODE` (`setup`|`teardown`), `CONFIG_FILE`, `DOMAIN`, `CUSTOM_DOMAIN`, `LOCATION`, and all 9 resource-name variables listed in Global Constraints; helper `log()`. Tasks 3–5 append below this code.

- [ ] **Step 1: Write the skeleton**

Create `scripts/setup-gcs-cdn.sh` with exactly:

```bash
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
```

Then: `chmod +x scripts/setup-gcs-cdn.sh`

- [ ] **Step 2: Lint**

Run: `bash -n scripts/setup-gcs-cdn.sh && shellcheck scripts/setup-gcs-cdn.sh`
Expected: no output, exit 0. (If shellcheck flags SC2034 "unused variable" on the resource names — expected at this stage, they're consumed in Tasks 3–5; silence per-line only if it still fires after Task 5, never with a blanket disable.)

- [ ] **Step 3: Verify arg-error paths (exit before any gcloud call)**

Run: `scripts/setup-gcs-cdn.sh; echo "exit=$?"`
Expected: usage block on stderr, `exit=1`

Run: `scripts/setup-gcs-cdn.sh mybucket; echo "exit=$?"`
Expected: usage block on stderr, `exit=1`

- [ ] **Step 4: Commit**

```bash
git add scripts/setup-gcs-cdn.sh
git commit -m "feat(deploy): scaffold GCP CDN setup script (args, names, preflight)"
```

---

### Task 3: Provisioning — bucket, IP, domain, cert, CDN, LB, redirect

**Files:**
- Modify: `scripts/setup-gcs-cdn.sh` (append at end)

**Interfaces:**
- Consumes: all variables from Task 2.
- Produces: `LB_IP`, resolved `DOMAIN`; all GCP resources exist after run. Task 4 appends after this block.

- [ ] **Step 1: Append the provisioning block**

Append to `scripts/setup-gcs-cdn.sh`:

```bash
# ---- 1. GCS bucket ----
if gcloud storage buckets describe "gs://${BUCKET}" >/dev/null 2>&1; then
  log "bucket gs://${BUCKET} exists, skip create"
else
  gcloud storage buckets create "gs://${BUCKET}" \
    --location="${LOCATION}" --uniform-bucket-level-access
  log "created bucket gs://${BUCKET} (${LOCATION})"
fi
# SPA fallback: unknown path เสิร์ฟ index.html (status 404 แต่ SPA boot ได้ — ดู docs/deploy.md)
gcloud storage buckets update "gs://${BUCKET}" \
  --web-main-page-suffix=index.html --web-error-page=index.html
# backend bucket เสิร์ฟ object private ไม่ได้ — ต้อง public read (แอป auth-gated อยู่แล้ว)
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member=allUsers --role=roles/storage.objectViewer >/dev/null
log "bucket SPA fallback + public read ready"

# ---- 2. global static IP (จองก่อน เพื่อ derive sslip.io domain) ----
if gcloud compute addresses describe "${IP_NAME}" --global >/dev/null 2>&1; then
  log "address ${IP_NAME} exists, skip"
else
  gcloud compute addresses create "${IP_NAME}" --global --ip-version=IPV4
fi
LB_IP="$(gcloud compute addresses describe "${IP_NAME}" --global --format='value(address)')"
log "LB IP: ${LB_IP}"

# ---- 3. domain ----
[ -n "${DOMAIN}" ] || DOMAIN="${LB_IP//./-}.sslip.io"
log "domain: ${DOMAIN}"

# ---- 4. managed SSL cert ----
if gcloud compute ssl-certificates describe "${CERT_NAME}" >/dev/null 2>&1; then
  CERT_DOMAINS="$(gcloud compute ssl-certificates describe "${CERT_NAME}" --format='value(managed.domains)')"
  if [[ "${CERT_DOMAINS}" == *"${DOMAIN}"* ]]; then
    log "cert ${CERT_NAME} exists for ${DOMAIN}, skip"
  else
    log "WARNING: cert ${CERT_NAME} covers '${CERT_DOMAINS}', not '${DOMAIN}'"
    log "  to switch domain: --teardown then re-run setup"
    exit 1
  fi
else
  gcloud compute ssl-certificates create "${CERT_NAME}" --domains="${DOMAIN}"
  log "created managed cert for ${DOMAIN}"
fi

# ---- 5. backend bucket + Cloud CDN ----
# USE_ORIGIN_HEADERS: CDN เคารพ cache-control ที่ deploy-gcs.sh ตั้ง (index.html no-cache ต้องรอด)
if gcloud compute backend-buckets describe "${BACKEND_NAME}" >/dev/null 2>&1; then
  log "backend bucket ${BACKEND_NAME} exists, skip"
else
  gcloud compute backend-buckets create "${BACKEND_NAME}" \
    --gcs-bucket-name="${BUCKET}" --enable-cdn --cache-mode=USE_ORIGIN_HEADERS
fi

# ---- 6. URL map ----
if gcloud compute url-maps describe "${URL_MAP}" >/dev/null 2>&1; then
  log "url map ${URL_MAP} exists, skip"
else
  gcloud compute url-maps create "${URL_MAP}" --default-backend-bucket="${BACKEND_NAME}"
fi

# ---- 7. HTTPS proxy + forwarding rule ----
if gcloud compute target-https-proxies describe "${HTTPS_PROXY}" >/dev/null 2>&1; then
  log "https proxy ${HTTPS_PROXY} exists, skip"
else
  gcloud compute target-https-proxies create "${HTTPS_PROXY}" \
    --url-map="${URL_MAP}" --ssl-certificates="${CERT_NAME}"
fi
if gcloud compute forwarding-rules describe "${HTTPS_RULE}" --global >/dev/null 2>&1; then
  log "forwarding rule ${HTTPS_RULE} exists, skip"
else
  gcloud compute forwarding-rules create "${HTTPS_RULE}" --global \
    --address="${IP_NAME}" --target-https-proxy="${HTTPS_PROXY}" --ports=443
fi

# ---- 8. HTTP→HTTPS redirect ----
if gcloud compute url-maps describe "${REDIRECT_MAP}" >/dev/null 2>&1; then
  log "redirect map ${REDIRECT_MAP} exists, skip"
else
  gcloud compute url-maps import "${REDIRECT_MAP}" --global --quiet <<EOF
name: ${REDIRECT_MAP}
defaultUrlRedirect:
  httpsRedirect: true
  redirectResponseCode: MOVED_PERMANENTLY_DEFAULT
EOF
fi
if gcloud compute target-http-proxies describe "${HTTP_PROXY}" >/dev/null 2>&1; then
  log "http proxy ${HTTP_PROXY} exists, skip"
else
  gcloud compute target-http-proxies create "${HTTP_PROXY}" --url-map="${REDIRECT_MAP}"
fi
if gcloud compute forwarding-rules describe "${HTTP_RULE}" --global >/dev/null 2>&1; then
  log "forwarding rule ${HTTP_RULE} exists, skip"
else
  gcloud compute forwarding-rules create "${HTTP_RULE}" --global \
    --address="${IP_NAME}" --target-http-proxy="${HTTP_PROXY}" --ports=80
fi
```

- [ ] **Step 2: Lint**

Run: `bash -n scripts/setup-gcs-cdn.sh && shellcheck scripts/setup-gcs-cdn.sh`
Expected: exit 0, no findings.

- [ ] **Step 3: Commit**

```bash
git add scripts/setup-gcs-cdn.sh
git commit -m "feat(deploy): provision bucket, CDN, HTTPS LB, managed cert"
```

---

### Task 4: Finish flow — config upload, first deploy, cert wait, summary

**Files:**
- Modify: `scripts/setup-gcs-cdn.sh` (append at end)

**Interfaces:**
- Consumes: `BUCKET`, `CONFIG_FILE`, `URL_MAP`, `CERT_NAME`, `DOMAIN`, `LB_IP`, `CUSTOM_DOMAIN` from Tasks 2–3; calls `scripts/deploy-gcs.sh <bucket> <url-map>` (existing script, unchanged).

- [ ] **Step 1: Append the finish block**

Append to `scripts/setup-gcs-cdn.sh`:

```bash
# ---- config.json — อัปโหลดครั้งแรกเท่านั้น ห้ามทับของ environment (ดู docs/deploy.md) ----
if gcloud storage objects describe "gs://${BUCKET}/config.json" >/dev/null 2>&1; then
  log "config.json already on bucket — kept as-is"
else
  gcloud storage cp "${CONFIG_FILE}" "gs://${BUCKET}/config.json" --cache-control="no-cache"
  log "uploaded ${CONFIG_FILE} as gs://${BUCKET}/config.json"
fi

# ---- first deploy (build + rsync + cache headers + CDN invalidation) ----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"${SCRIPT_DIR}/deploy-gcs.sh" "${BUCKET}" "${URL_MAP}"

# ---- รอ cert ACTIVE (sslip.io resolve ทันที — รอบแรก ~15-40 นาที) ----
log "waiting for managed cert to go ACTIVE..."
DEADLINE=$((SECONDS + 2400))
CERT_STATUS=""
while :; do
  CERT_STATUS="$(gcloud compute ssl-certificates describe "${CERT_NAME}" --format='value(managed.status)')"
  [ "${CERT_STATUS}" = "ACTIVE" ] && break
  if [ "${SECONDS}" -ge "${DEADLINE}" ]; then
    log "cert still ${CERT_STATUS:-unknown} after 40 min — not fatal; site serves once ACTIVE."
    log "check: gcloud compute ssl-certificates describe ${CERT_NAME} --format='value(managed.status)'"
    break
  fi
  log "cert status: ${CERT_STATUS:-PROVISIONING} — recheck in 30s"
  sleep 30
done

# ---- summary ----
echo
log "=================================================="
log "site:         https://${DOMAIN}"
log "LB IP:        ${LB_IP}"
log "cert status:  ${CERT_STATUS:-unknown}"
log "next deploys: scripts/deploy-gcs.sh ${BUCKET} ${URL_MAP}"
if [ "${CUSTOM_DOMAIN}" = true ]; then
  log "DNS: point an A record for ${DOMAIN} to ${LB_IP} — cert activates after DNS resolves"
fi
log "REQUIRED (backend team): enable CORS for origin https://${DOMAIN}"
log "  methods GET/POST/PUT/PATCH/DELETE; headers Authorization, Content-Type, x-app-id"
log "=================================================="
```

- [ ] **Step 2: Lint**

Run: `bash -n scripts/setup-gcs-cdn.sh && shellcheck scripts/setup-gcs-cdn.sh`
Expected: exit 0, no findings.

- [ ] **Step 3: Commit**

```bash
git add scripts/setup-gcs-cdn.sh
git commit -m "feat(deploy): config upload, first deploy, cert wait, summary"
```

---

### Task 5: Teardown mode

**Files:**
- Modify: `scripts/setup-gcs-cdn.sh` — insert teardown block **between the preflight `if [ "${MODE}" = "setup" ]; then ... fi` block (end of Task 2 code) and the `# ---- 1. GCS bucket ----` line** (teardown must run before any provisioning).

**Interfaces:**
- Consumes: `MODE` and all resource-name variables from Task 2.
- Produces: `--teardown` deletes LB/CDN resources in reverse order; bucket kept.

- [ ] **Step 1: Insert the teardown block**

Insert at the position described above:

```bash
# ---- teardown: ลบย้อนลำดับ ไม่แตะ GCS bucket ----
if [ "${MODE}" = "teardown" ]; then
  echo "Will delete (project ${PROJECT}):"
  echo "  ${HTTP_RULE} ${HTTPS_RULE} ${HTTP_PROXY} ${HTTPS_PROXY}"
  echo "  ${REDIRECT_MAP} ${URL_MAP} ${CERT_NAME} ${BACKEND_NAME} ${IP_NAME}"
  echo "GCS bucket gs://${BUCKET} will be KEPT."
  read -r -p "Proceed? [y/N] " ANSWER
  [ "${ANSWER}" = "y" ] || { log "aborted"; exit 0; }
  del() { # del <kind> <name> [flags...]
    local kind="$1" name="$2"; shift 2
    if gcloud compute "${kind}" describe "${name}" "$@" >/dev/null 2>&1; then
      gcloud compute "${kind}" delete "${name}" "$@" --quiet
      log "deleted ${kind} ${name}"
    else
      log "${kind} ${name} absent, skip"
    fi
  }
  del forwarding-rules "${HTTP_RULE}" --global
  del forwarding-rules "${HTTPS_RULE}" --global
  del target-http-proxies "${HTTP_PROXY}"
  del target-https-proxies "${HTTPS_PROXY}"
  del url-maps "${REDIRECT_MAP}"
  del url-maps "${URL_MAP}"
  del ssl-certificates "${CERT_NAME}"
  del backend-buckets "${BACKEND_NAME}"
  del addresses "${IP_NAME}" --global
  log "done. bucket kept — delete manually: gcloud storage rm -r gs://${BUCKET}"
  exit 0
fi
```

- [ ] **Step 2: Lint**

Run: `bash -n scripts/setup-gcs-cdn.sh && shellcheck scripts/setup-gcs-cdn.sh`
Expected: exit 0, no findings.

- [ ] **Step 3: Commit**

```bash
git add scripts/setup-gcs-cdn.sh
git commit -m "feat(deploy): --teardown mode (reverse-order delete, bucket kept)"
```

---

### Task 6: Doc updates — docs/deploy.md + CLAUDE.md

**Files:**
- Modify: `docs/deploy.md` (GCP section, lines ~36–69)
- Modify: `CLAUDE.md` (Commands block, the `scripts/deploy-{s3,gcs,docker}.sh` line)

**Interfaces:**
- Consumes: script interface from Task 2 (`setup-gcs-cdn.sh <bucket> <config-file> [domain]` / `--teardown`).

- [ ] **Step 1: Rewrite the GCP one-time-setup section in docs/deploy.md**

Replace the content of `## GCP — Cloud Storage (+ optional Cloud CDN)` → `### One-time infrastructure setup` (keep the `### Each release` subsection) with:

```markdown
### One-time infrastructure setup

One command provisions everything (bucket → Cloud CDN → HTTPS LB → managed cert)
and runs the first deploy:

```bash
scripts/setup-gcs-cdn.sh <bucket> config.<env>.json            # no domain? auto <LB-IP>.sslip.io
scripts/setup-gcs-cdn.sh <bucket> config.<env>.json app.example.com
scripts/setup-gcs-cdn.sh <bucket> --teardown                   # delete LB/CDN (bucket kept)
```

- Idempotent — safe to re-run; every resource is create-if-missing.
- `config.json` is uploaded only if absent on the bucket (never overwritten).
- With a custom domain, point an A record to the printed LB IP; the managed
  cert activates once DNS resolves. Without one, sslip.io resolves immediately
  (first cert takes ~15–40 min).
- Cache mode is `USE_ORIGIN_HEADERS`, so the per-object headers set by
  `deploy-gcs.sh` (immutable assets, no-cache `index.html`) drive the CDN.
- Remember the backend CORS prerequisite (Shared notes below).

<details><summary>What the script creates (manual reference)</summary>

[keep the OLD manual steps 1–4 here verbatim as the reference appendix]

</details>
```

- [ ] **Step 2: Update CLAUDE.md Commands line**

In `CLAUDE.md`, change:

```
scripts/deploy-{s3,gcs,docker}.sh       # Deploy: S3/CloudFront · GCS/Cloud CDN · Docker nginx image (docs/deploy.md)
```

to:

```
scripts/setup-gcs-cdn.sh <bucket> <config> [domain]   # One-shot GCP infra (CDN+LB+cert) + first deploy (docs/deploy.md)
scripts/deploy-{s3,gcs,docker}.sh       # Deploy: S3/CloudFront · GCS/Cloud CDN · Docker nginx image (docs/deploy.md)
```

- [ ] **Step 3: Verify docs render**

Run: `grep -n "setup-gcs-cdn" docs/deploy.md CLAUDE.md`
Expected: hits in both files.

- [ ] **Step 4: Commit**

```bash
git add docs/deploy.md CLAUDE.md
git commit -m "docs(deploy): document one-shot GCP CDN setup script"
```

---

### Task 7: Real-run acceptance against a live GCP project

**Files:** none (verification only).

**Interfaces:**
- Consumes: the finished script + user-provided GCP project, bucket name, and `config.<env>.json`.

⚠️ **Gate: STOP and confirm with the user before this task.** It creates billable resources (global forwarding rules + LB ≈ $18+/month) and needs interactive auth. Ask the user for: project ID, bucket name, config file path. The user runs auth themselves:

```
! gcloud auth login
! gcloud config set project <project-id>
```

- [ ] **Step 1: First run (background — build + cert wait can take 40+ min)**

Run: `scripts/setup-gcs-cdn.sh <bucket> <config-file>` (in background; monitor output)
Expected: every resource logs `created ...`; deploy-gcs.sh output ends with `Deployed to gs://<bucket> and invalidated /index.html on <bucket>-url-map`; summary prints `site: https://<ip-dashed>.sslip.io`.

- [ ] **Step 2: Idempotency re-run**

Run: `scripts/setup-gcs-cdn.sh <bucket> <config-file>` again
Expected: every resource logs `exists, skip`; no errors.

- [ ] **Step 3: HTTP checks (after cert ACTIVE)**

```bash
DOMAIN=<printed-domain>
curl -sI "https://${DOMAIN}/index.html" | grep -iE '^(HTTP|cache-control)'
# Expected: HTTP/2 200 + cache-control: no-cache
ASSET="$(curl -s "https://${DOMAIN}/index.html" | grep -oE '/assets/[^"]+\.js' | head -1)"
curl -sI "https://${DOMAIN}${ASSET}" | grep -iE '^(HTTP|cache-control)'
# Expected: HTTP/2 200 + cache-control: public,max-age=31536000,immutable
curl -sI "http://${DOMAIN}/" | grep -iE '^(HTTP|location)'
# Expected: HTTP/1.1 301 + location: https://...
curl -s -o /dev/null -w '%{http_code}' "https://${DOMAIN}/dashboard"
# Expected: 404 — but body is index.html (SPA boots); verify:
curl -s "https://${DOMAIN}/dashboard" | grep -c '<div id="root">'
# Expected: 1
```

- [ ] **Step 4: Browser smoke**

Open `https://<domain>` — login page loads, deep route hard-refresh works, no console errors (backend CORS must be configured first; if not, note API calls fail by design until the backend allows the origin).

- [ ] **Step 5: Record results**

Append verified URL + any deviations to the "Known open items" section of `CLAUDE.md` if relevant, commit if changed.

---

## Self-review notes

- Spec coverage: interface (T2), resources 1–8 (T3), flow 3–6 (T4), teardown (T5), docs (T6), verification (T7) — all spec sections mapped.
- Type consistency: resource-name variables defined once in T2, consumed verbatim in T3–T5.
- No placeholders: every code step carries full content; the one bracketed line in T6 ("keep the OLD manual steps") is an explicit move-existing-text instruction, not a TBD.
