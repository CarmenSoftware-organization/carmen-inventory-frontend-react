# CARMEN BLUE SPA — static bundle served by nginx
# Runtime env (ตั้งตอน docker run / compose — ไม่ฝังใน bundle):
#   BACKEND_URL  (required)  origin ของ backend ที่ nginx จะ proxy /api/* ไปหา
#   X_APP_ID     (required)  ค่า x-app-id ของ frontend app
#   WS_URL       (optional)  WebSocket URL ของ notification
#
# สถาปัตยกรรม: nginx proxy /api/* → BACKEND_URL (เหมือน Next server เดิม)
# ดังนั้น config.json ใน container ใช้ BACKEND_URL:"" (same-origin) — ไม่ต้องเปิด CORS ที่ backend

# ─── Builder ─────────────────────────────────────────────────────────────────
FROM oven/bun:1 AS builder
WORKDIR /app

# vendor/ ต้องมาก่อน install — xlsx ถูก pin เป็น tarball ในรีโป ไม่ได้ดึงจาก CDN
# (ดู vendor/README.md ว่าทำไม)
COPY package.json bun.lock ./
COPY vendor/ ./vendor/
RUN bun install --frozen-lockfile

COPY . .
# config ของ dev ห้ามติดไป image (สร้างใหม่ตอน start จาก env)
RUN rm -f public/config.json && bun run build && rm -f dist/config*.json

# ─── Runner ──────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# TLS verification ของ proxy → backend: เปิดเป็นค่า default
# (UAT self-signed เท่านั้นที่ควร override เป็น off — ดู docs/deploy.md)
ENV PROXY_SSL_VERIFY=on

# template ถูก render ด้วย envsubst อัตโนมัติโดย entrypoint ของ nginx image
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
# สคริปต์ที่รันอัตโนมัติก่อน nginx start (ตามลำดับเลข)
#   30 — security headers (CSP ต้องรู้ WS_URL ที่เป็น optional จึง render ด้วย shell ไม่ใช่ envsubst)
#   40 — config.json จาก env
COPY docker/30-render-security-headers.sh /docker-entrypoint.d/30-render-security-headers.sh
COPY docker/40-render-config-json.sh /docker-entrypoint.d/40-render-config-json.sh
RUN chmod +x /docker-entrypoint.d/30-render-security-headers.sh \
             /docker-entrypoint.d/40-render-config-json.sh

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO /dev/null http://127.0.0.1/healthz || exit 1
