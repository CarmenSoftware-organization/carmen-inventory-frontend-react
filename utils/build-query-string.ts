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
export function buildQueryString<T extends object>(
  params?: T,
): string {
  return Object.entries(params ?? {})
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
    .join("&");
}

/**
 * รวม base URL กับ query string ที่สร้างจาก params ให้เป็น URL สมบูรณ์
 *
 * ถ้าไม่มี params หรือ params ว่างทั้งหมด จะคืน baseUrl ตามเดิมโดยไม่ต่อ `?`
 *
 * @param baseUrl - URL ฐานที่จะใช้ต่อ query string
 * @param params - object ของ query params (optional)
 * @returns URL ที่รวม query string แล้ว
 * @example
 * ```ts
 * buildUrl("/api/users", { page: 1 }); // "/api/users?page=1"
 * ```
 */
export function buildUrl<T extends object>(
  baseUrl: string,
  params?: T,
): string {
  const qs = buildQueryString(params);
  return qs ? `${baseUrl}?${qs}` : baseUrl;
}
