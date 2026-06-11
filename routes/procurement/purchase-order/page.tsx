import PoComponent from "./_components/po-component";

/**
 * หน้ารายการใบสั่งซื้อ (Purchase Order) หลัก ทำหน้าที่เป็น entry point
 * ของเส้นทาง `/procurement/purchase-order` โดยเรนเดอร์ `PoComponent` ซึ่ง
 * จัดการ state, toolbar, filter และ DataGrid ของรายการ PO ทั้งหมด
 *
 * @returns React element ของหน้ารายการใบสั่งซื้อ
 * @example
 * // ถูกเรียกอัตโนมัติโดย Next.js App Router เมื่อเข้า URL
 * // /procurement/purchase-order
 * <PurchaseOrderPage />
 */
export default function PurchaseOrderPage() {
  return <PoComponent />;
}

export const Component = PurchaseOrderPage;
