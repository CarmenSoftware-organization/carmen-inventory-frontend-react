/**
 * แปลง object ของ params เป็น query string โดยข้าม value ที่เป็น undefined, null หรือสตริงว่าง
 *
 * ใช้ `encodeURIComponent` เพื่อ encode ตาม RFC 3986 (space → `%20`) แทน
 * `URLSearchParams.toString()` ที่ encode space เป็น `+` (form-encoded)
 *
 * @param params - object ที่มี key-value pair สำหรับสร้าง query string
 * @returns query string (ไม่มีเครื่องหมาย `?` นำหน้า)
 * @example
 * ```ts
 * buildQueryString({ page: 1, search: "Credit Note" });
 * // "page=1&search=Credit%20Note"
 * ```
 */
export function buildQueryString<T extends object>(params?: T): string {
  return Object.entries(params ?? {})
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    )
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
    .join("&");
}

export function buildUrl<T extends object>(
  baseUrl: string,
  params?: T,
): string {
  const qs = buildQueryString(params);
  return qs ? `${baseUrl}?${qs}` : baseUrl;
}
