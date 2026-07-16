import { useProfile } from "@/hooks/use-profile";

/**
 * ตัดสินว่า brand ของ interface เห็นได้ไหมตาม entitlement (license) ของ BU ปัจจุบัน
 *
 * `enabled` คือ `enabled_interfaces` จาก profile — key รูปแบบ `<category>_<brand>`
 * เช่น `pos_micros`
 * - `undefined` (gateway รุ่นเก่ายังไม่ส่ง field) → โชว์ทุก brand (backward compat)
 * - `[]` → ไม่เห็นอะไรเลย (platform ปิดหมด)
 *
 * แยกเป็น pure function เพื่อ test ตรง ๆ โดยไม่ต้อง mock profile
 */
export function interfaceEntitled(
  enabled: readonly string[] | undefined,
  categoryKey: string,
  brandKey: string,
): boolean {
  if (enabled == null) return true;
  return enabled.includes(`${categoryKey}_${brandKey}`);
}

/**
 * Hook คืน predicate ว่า brand ไหน entitled ตาม profile ปัจจุบัน
 *
 * ผูกกับ `useProfile()` โดยตรงจึง share cache เดียวกัน — สลับ BU แล้ว profile refetch
 * ทำให้ entitlement อัปเดตเองโดยไม่ต้องยิงเพิ่ม
 *
 * @returns `isEntitled(category, brand)` และ `hasEntitlementData` (false = gateway ยังไม่ส่ง field)
 */
export function useInterfaceEntitlement() {
  const { enabledInterfaces } = useProfile();
  return {
    isEntitled: (categoryKey: string, brandKey: string) =>
      interfaceEntitled(enabledInterfaces, categoryKey, brandKey),
    hasEntitlementData: enabledInterfaces != null,
  };
}
