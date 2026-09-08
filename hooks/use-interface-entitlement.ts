import { useProfile } from "@/hooks/use-profile";

/**
 * สิทธิ์ของ interface brand หนึ่ง
 * - `entitled` เห็นและแก้ได้
 * - `expired` เห็นแต่แก้ไม่ได้ สัญญาที่ให้สิทธิ์นี้หมดอายุหรือถูกระงับ
 * - `none` ไม่เห็นเลย ไม่เคยซื้อ
 */
export type InterfaceEntitlement = "entitled" | "expired" | "none";

/**
 * คีย์ license ของ brand หนึ่ง — ต้องตรงกับ `LICENSE_ONLY_RESOURCES` ฝั่ง backend
 * (`packages/prisma-shared-schema-platform/prisma/permission.route-map.ts`)
 */
export function interfaceFeatureKey(
  categoryKey: string,
  brandKey: string,
): string {
  return `interface.${categoryKey}.${brandKey}`;
}

/**
 * สายคีย์ที่ต้องมีครบ — `evaluateLicense` ฝั่ง backend ตรวจ feature **และบรรพบุรุษทุกชั้น**
 * และ server ไม่เติมบรรพบุรุษให้ FE จึงต้องตรวจแบบเดียวกัน ไม่งั้นสองฝั่งตัดสินคนละแบบ
 */
function chainOf(categoryKey: string, brandKey: string): readonly string[] {
  return [
    "interface",
    `interface.${categoryKey}`,
    interfaceFeatureKey(categoryKey, brandKey),
  ];
}

/**
 * ตัดสินสิทธิ์จากคีย์ล้วน — pure function เพื่อ test ตรง ๆ โดยไม่ต้อง mock profile
 *
 * `expiredFeatures` ถูกพิจารณาก็ต่อเมื่อสายคีย์ไม่ครบใน `features` เพราะสองรายการนี้ไม่ทับกัน
 * (backend ตัดคีย์ที่อยู่ใน `features` ออกจาก `expired_features` แล้ว) แต่บรรพบุรุษอาจมาจาก
 * สัญญาที่ยัง active ขณะที่ leaf มาจากใบที่หมดอายุ จึงต้องรวมสองรายการก่อนตรวจรอบที่สอง
 */
export function interfaceEntitlement(
  features: readonly string[] | undefined,
  expiredFeatures: readonly string[] | undefined,
  categoryKey: string,
  brandKey: string,
): InterfaceEntitlement {
  const chain = chainOf(categoryKey, brandKey);
  if (features && chain.every((k) => features.includes(k))) return "entitled";
  const merged = [...(features ?? []), ...(expiredFeatures ?? [])];
  if (chain.every((k) => merged.includes(k))) return "expired";
  return "none";
}

/**
 * Hook คืนตัวตัดสินสิทธิ์ของ brand ตาม profile ปัจจุบัน
 *
 * ผูกกับ `useProfile()` โดยตรงจึง share cache เดียวกัน — สลับ BU แล้ว profile refetch
 * ทำให้สิทธิ์อัปเดตเองโดยไม่ต้องยิงเพิ่ม
 *
 * **จงใจไม่เดินผ่าน `useLicense()` / `enforced`** — สวิตช์ `LICENSE_ENFORCEMENT` เป็น shadow
 * mode ของ license ทั่วไป แต่ interface ถูกบังคับใช้เสมอมาตั้งแต่ก่อนย้ายมาอยู่บนท่อ license
 * ถ้าให้มันขึ้นกับสวิตช์ สภาพแวดล้อมที่ยังไม่เปิด enforcement จะเปิด interface ให้ทุก BU เห็น
 * ครบทุกแบรนด์ ซึ่งกลับด้านจากพฤติกรรมเดิมและเป็นการหลุดสิทธิ์ ไม่ใช่การผ่อนปรน
 * **ห้าม "แก้ให้สม่ำเสมอ" โดยเอาไปเดินผ่าน `enforced`**
 *
 * @returns `entitlementOf(category, brand)` และ `isEntitled(category, brand)` (= ไม่ใช่ `none`)
 */
export function useInterfaceEntitlement() {
  const { license } = useProfile();

  const entitlementOf = (
    categoryKey: string,
    brandKey: string,
  ): InterfaceEntitlement => {
    const base = interfaceEntitlement(
      license?.features,
      license?.expired_features,
      categoryKey,
      brandKey,
    );
    // สัญญาที่ให้สิทธิ์นี้เองหมดอายุ/ถูกระงับ — ของยังอยู่ในสัญญาแต่แก้ไม่ได้
    if (
      base === "entitled" &&
      (license?.state === "expired" || license?.state === "inactive")
    ) {
      return "expired";
    }
    return base;
  };

  return {
    entitlementOf,
    isEntitled: (categoryKey: string, brandKey: string) =>
      entitlementOf(categoryKey, brandKey) !== "none",
  };
}
