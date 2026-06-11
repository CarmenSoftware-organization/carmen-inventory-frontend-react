#!/usr/bin/env bash
# แปลง Next page.tsx (ที่ copy มาแล้ว) เป็น react-router lazy route module:
# - ตัด import Metadata / next-intl server import / generateMetadata block
# - เติม `export const Component = <DefaultExportName>;` (lazy-route convention)
# Idempotent — รันซ้ำได้
# Usage: scripts/codemods/nextpage-to-route.sh <file.tsx ...>
set -euo pipefail

for f in "$@"; do
  perl -0pi -e '
    s/import type \{ Metadata \} from "next";\n//;
    s/import \{ getTranslations \} from "next-intl\/server";\n//;
    s/export async function generateMetadata\(\)[^{]*\{(?:[^{}]|\{[^{}]*\})*\}\n+//s;
  ' "$f"

  if ! grep -q "export const Component" "$f"; then
    name=$(perl -ne 'if (/export default (?:async )?function (\w+)/) { print $1; exit }' "$f")
    if [ -n "${name:-}" ]; then
      printf '\nexport const Component = %s;\n' "$name" >> "$f"
    else
      echo "WARN: $f has no named default export — add Component export manually" >&2
    fi
  fi
done
echo "Converted: $#  file(s)"
