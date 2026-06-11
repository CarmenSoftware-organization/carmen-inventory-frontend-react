#!/usr/bin/env bash
# Codemod: แปลง Next imports → Vite/React Router equivalents
# ใช้กับไดเรกทอรีที่ copy มาจาก carmen-inventory-frontend
# Usage: scripts/codemods/next-to-vite.sh [dir ...]   (default: ทุก source dir)
#
# Fixes applied vs. original snippet:
#   - TARGETS array literal had a stray leading quote; replaced with proper array expansion
#   - The @ in perl substitution for @/lib/compat/* must be escaped as \@ inside double-quoted
#     perl -e strings; kept as literal inside single-quoted heredoc-style but wrapped correctly
#   - "use client"/"use server" directive regex uses \x27 for single-quote portability across
#     BSD/GNU grep flavours
#   - Added existence check so the script silently skips dirs that don't exist yet (safe on
#     a fresh clone before bulk-copy step)
set -euo pipefail

# Default targets when no args supplied
DEFAULT_DIRS=(components hooks lib utils types constant routes i18n)

if [[ $# -gt 0 ]]; then
  DIRS=("$@")
else
  DIRS=()
  for d in "${DEFAULT_DIRS[@]}"; do
    [[ -d "$d" ]] && DIRS+=("$d")
  done
fi

# Nothing to do if no dirs exist/were given
if [[ ${#DIRS[@]} -eq 0 ]]; then
  echo "No target directories found or provided."
  exit 0
fi

# Filter to only existing dirs to avoid grep errors
EXISTING_DIRS=()
for d in "${DIRS[@]}"; do
  if [[ -d "$d" ]]; then
    EXISTING_DIRS+=("$d")
  else
    echo "Warning: directory '$d' not found, skipping." >&2
  fi
done

if [[ ${#EXISTING_DIRS[@]} -eq 0 ]]; then
  echo "No target directories exist."
  exit 0
fi

mod() { # mod <perl-substitution> <grep-pattern>
  local subst="$1" pattern="$2"
  # grep exits 1 when no files match — wrap in a group so || true applies before the pipe
  { grep -rl --include='*.ts' --include='*.tsx' -- "$pattern" "${EXISTING_DIRS[@]}" 2>/dev/null || true; } |
    while IFS= read -r f; do perl -pi -e "$subst" "$f"; done
}

# 1) next-intl → use-intl (hook API เหมือนกัน 100%)
mod 's{from "next-intl"}{from "use-intl"}g' 'from "next-intl"'

# 2) next/navigation → compat layer
# Note: @ is used literally inside single-quoted perl script — no escaping needed
mod 's{from "next/navigation"}{from "@/lib/compat/navigation"}g' 'from "next/navigation"'

# 3) next/link → compat Link (default export รับ href)
mod 's{from "next/link"}{from "@/lib/compat/link"}g' 'from "next/link"'

# 4) ตัด directive "use client" / "use server"
#    Matches lines that are ONLY the directive (with optional trailing whitespace/semicolon).
#    \x27 = single-quote, avoids shell quoting conflicts.
#    -E regex for grep, plain regex for perl (both engines support \x27 in character classes).
# grep exits 1 when no match — wrap with || true before pipe
{ grep -rl --include='*.ts' --include='*.tsx' \
    -E '^["'"'"']use (client|server)["'"'"'];?[[:space:]]*$' \
    "${EXISTING_DIRS[@]}" 2>/dev/null || true; } |
  while IFS= read -r f; do
    perl -ni -e 'print unless /^(["'"'"'])use (client|server)\1;?\s*$/' "$f"
  done

echo "── Remaining Next imports (must be fixed manually): ──"
grep -rn --include='*.ts' --include='*.tsx' 'from "next' "${EXISTING_DIRS[@]}" 2>/dev/null || echo "  (none)"
