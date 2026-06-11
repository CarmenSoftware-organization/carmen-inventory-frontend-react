import { StoreRequisitionForm } from "../_components/sr-form";

/**
 * หน้าสร้างใบเบิกสินค้าใหม่ แสดงฟอร์มสำหรับสร้างใบเบิกในโหมด add
 * @param - ไม่มีพารามิเตอร์
 * @returns คอมโพเนนต์หน้าสร้างใบเบิกใหม่
 * @example
 * // ใช้เป็นหน้า /store-operation/store-requisition/new
 * <NewStoreRequisitionPage />
 */
export default function NewStoreRequisitionPage() {
  return <StoreRequisitionForm />;
}

export const Component = NewStoreRequisitionPage;
