#!/bin/sh
# สร้าง /usr/share/nginx/html/config.json จาก env ตอน container start
# (รันอัตโนมัติโดย /docker-entrypoint.sh ของ nginx image)
# BACKEND_URL ใน config.json เป็น "" เสมอ — browser ยิง same-origin แล้ว nginx proxy /api ให้
set -eu

: "${BACKEND_URL:?BACKEND_URL is required (backend origin for the /api proxy)}"
: "${X_APP_ID:?X_APP_ID is required}"

CONFIG=/usr/share/nginx/html/config.json

if [ -n "${WS_URL:-}" ]; then
  printf '{\n  "BACKEND_URL": "",\n  "X_APP_ID": "%s",\n  "WS_URL": "%s"\n}\n' "$X_APP_ID" "$WS_URL" > "$CONFIG"
else
  printf '{\n  "BACKEND_URL": "",\n  "X_APP_ID": "%s"\n}\n' "$X_APP_ID" > "$CONFIG"
fi

echo "[config] rendered $CONFIG (proxy → $BACKEND_URL)"
