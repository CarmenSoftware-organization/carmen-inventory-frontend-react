import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * รวม className แบบ conditional และ merge Tailwind classes ที่ซ้อนทับ
 *
 * ใช้ clsx รวม classes แล้วส่งต่อให้ twMerge deduplicate Tailwind utility ที่ขัดแย้งกัน
 *
 * @param inputs - className values (string, object, array, ฯลฯ)
 * @returns string ของ className ที่ merge แล้ว
 * @example
 * ```ts
 * cn("px-2", condition && "px-4") // "px-4" if condition
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * ตรวจว่า string มี control character (C0 0x00–0x1F หรือ DEL 0x7F) หรือไม่
 *
 * ใช้ charCodeAt แทน control-char regex literal เพื่อเลี่ยง lint `no-control-regex`
 * — ใช้กรอง whitespace/newline trick ออกจาก URL ก่อน validate
 *
 * @param value - string ที่จะตรวจ
 * @returns true หากพบ control character
 */
function hasControlChars(value: string): boolean {
  return [...value].some((ch) => {
    const code = ch.charCodeAt(0)
    return code <= 31 || code === 127
  })
}

/**
 * Only allow http/https URLs — blocks javascript:, data:, etc.
 *
 * ตรวจสอบ URL ว่าปลอดภัยสำหรับใส่ใน href หรือ src — trim, reject control characters,
 * validate ผ่าน `new URL()` แล้วคืน canonical form (`parsed.toString()`) เฉพาะ http(s)
 * ป้องกัน XSS attack จาก javascript: หรือ data: protocol
 *
 * @param url - URL string ที่จะตรวจสอบ
 * @returns canonical URL หากปลอดภัย, undefined หากไม่ใช่ http/https หรือ parse ไม่ได้
 * @example
 * ```ts
 * sanitizeUrl("https://carmen.app"); // "https://carmen.app/"
 * sanitizeUrl("javascript:alert(1)"); // undefined
 * ```
 */
export function sanitizeUrl(url: string): string | undefined {
  const candidate = url.trim()
  if (!candidate || hasControlChars(candidate)) return undefined
  try {
    const parsed = new URL(candidate)
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString()
    }
  } catch {
    // invalid URL — fall through to undefined
  }
  return undefined
}

/**
 * Returns a navigation-safe href, or null if the input is unsafe.
 *
 * Accepts:
 * - Absolute URLs with http(s) protocol (validated + canonicalized via sanitizeUrl)
 * - Internal paths that start with a single "/" (not "//" protocol-relative)
 *   and contain no backslash anywhere (mangled / traversal-like forms)
 *
 * Trims input and rejects control characters first. Rejects javascript:, data:,
 * vbscript:, file:, and protocol-relative URLs.
 */
export function safeNavigationHref(input: string | null | undefined): string | null {
  if (!input) return null
  const candidate = input.trim()
  if (!candidate || hasControlChars(candidate)) return null

  const absolute = sanitizeUrl(candidate)
  if (absolute) return absolute

  if (
    candidate.startsWith("/") &&
    !candidate.startsWith("//") &&
    !candidate.includes("\\")
  ) {
    return candidate
  }
  return null
}

/**
 * คืน internal-path-only href (สำหรับ client-side routing) หรือ null หากไม่ปลอดภัย
 *
 * ป้องกัน open-redirect (CWE-601) โดยเป็น sanitizer เฉพาะทางสำหรับ internal navigation
 * — ไม่มี return path ที่เป็น absolute/external URL เลย รับเฉพาะ path ที่ขึ้นต้น `/` เดียว
 * และ reject:
 * - control characters
 * - protocol-relative (`//example.com`)
 * - backslash-mangled (`/\`, `/path\x`)
 * - absolute-scheme ใดๆ (`http:`, `javascript:`, ฯลฯ) ผ่าน scheme regex
 *
 * @param input - href ดิบ (รับ null/undefined ได้)
 * @returns internal path หรือ null หากไม่ปลอดภัย
 * @example
 * ```ts
 * safeInternalHref("/procurement/pr/123"); // "/procurement/pr/123"
 * safeInternalHref("https://evil.com");    // null
 * safeInternalHref("//evil.com");          // null
 * ```
 */
export function safeInternalHref(input: string | null | undefined): string | null {
  if (!input) return null
  const candidate = input.trim()
  if (!candidate || hasControlChars(candidate)) return null
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return null
  if (candidate.includes("\\")) return null
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(candidate)) return null
  return candidate
}

/**
 * คืน plain-text ปลอดภัยสำหรับเขียนลงหน้าเว็บ (text content หรือ attribute เช่น aria-label)
 *
 * ตัดอักขระเปิด/ปิด HTML tag (`<`, `>`) ออก เพื่อกัน DOM-based XSS เมื่อนำ
 * backend free-text (เช่น notification title) ไปเขียนลง DOM — เป็น defense-in-depth
 * เสริมจาก auto-escape ของ React (ไม่ตัด space / ตัวอักษร / ตัวเลข ข้อความยังอ่านได้ครบ)
 *
 * @param input - ข้อความดิบจาก backend (รับ null/undefined ได้ → คืน "")
 * @returns plain text ที่ตัดอักขระอันตรายและ trim แล้ว
 * @example
 * ```ts
 * sanitizeText("PR-001 <img onerror=alert(1)>"); // "PR-001 img onerror=alert(1)"
 * ```
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return ""
  return input.replaceAll(/[<>]/g, "").trim()
}
