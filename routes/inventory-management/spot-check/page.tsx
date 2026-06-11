import ScComponent from "./_components/sc-component";

/**
 * หน้ารายการ Spot Check (การสุ่มตรวจสต็อก)
 * Route entry ของ /inventory-management/spot-check render ScComponent
 *
 * @returns React element ของหน้ารายการ spot check
 * @example
 * // เข้าถึงผ่าน URL: /inventory-management/spot-check
 * export default SpotCheckPage;
 */
export default function SpotCheckPage() {
  return <ScComponent />;
}

export const Component = SpotCheckPage;
