import { useProfile } from "@/hooks/use-profile";

/**
 * Hook ดึง buCode ของ business unit ปัจจุบันจาก user profile
 *
 * เป็น helper hook สำหรับใช้ใน CRUD hooks ทุกตัวที่ต้องส่ง buCode เป็น param แรก
 * ไปยัง API proxy ดึงค่าจาก `useProfile()` โดยตรงจึง share cache กับ profile query
 * เมื่อ profile ยังโหลดไม่เสร็จจะได้ `undefined` ต้อง guard ด้วย `enabled: !!buCode`
 *
 * @returns buCode string หรือ undefined หากยังไม่พร้อม
 * @example
 * ```ts
 * const buCode = useBuCode();
 * const { data } = useQuery({
 *   queryKey: ["vendors", buCode],
 *   queryFn: () => getVendors(buCode!),
 *   enabled: !!buCode,
 * });
 * ```
 */
export function useBuCode() {
  const { buCode } = useProfile();
  return buCode;
}
