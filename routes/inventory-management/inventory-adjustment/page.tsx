import InventoryAdjustmentComponent from "./_components/ia-component";

/**
 * หน้ารายการ Inventory Adjustment รองรับทั้ง Stock In และ Stock Out
 * ประกอบด้วย tab สลับประเภท ตาราง/การ์ด และปุ่มสร้างรายการใหม่
 * @returns React element ของหน้ารายการปรับปรุงสต็อก
 * @example
 * // ใช้เป็นหน้า route /inventory-management/inventory-adjustment
 * <InventoryAdjustmentPage />
 */
export default function InventoryAdjustmentPage() {
  return <InventoryAdjustmentComponent />;
}

export const Component = InventoryAdjustmentPage;
