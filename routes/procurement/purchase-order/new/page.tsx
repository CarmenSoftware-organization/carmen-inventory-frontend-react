import PoForm from "../_components/po-form";

/**
 * หน้าสร้างใบสั่งซื้อใหม่ (New Purchase Order) เรนเดอร์ `PoForm` ในโหมด
 * add โดยไม่ส่ง `purchaseOrder` prop เพื่อให้ฟอร์มใช้ค่า default values
 * จาก schema และเปิดให้กรอกข้อมูลทุกฟิลด์
 *
 * @returns React element ของฟอร์มสร้างใบสั่งซื้อใหม่
 * @example
 * // ถูกเรียกอัตโนมัติโดย Next.js App Router เมื่อเข้า URL
 * // /procurement/purchase-order/new
 * <NewPurchaseOrderPage />
 */
export default function NewPurchaseOrderPage() {
  return <PoForm />;
}

export const Component = NewPurchaseOrderPage;
