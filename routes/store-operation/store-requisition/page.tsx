import StoreRequisitionComponent from "./_components/sr-component";

/**
 * หน้ารายการใบเบิกสินค้า (Store Requisition) แสดงคอมโพเนนต์หลักของรายการใบเบิก
 * @param - ไม่มีพารามิเตอร์
 * @returns คอมโพเนนต์หน้ารายการ store requisition
 * @example
 * // ใช้เป็นหน้า /store-operation/store-requisition
 * <StoreRequisitionPage />
 */
export default function StoreRequisitionPage() {
  return <StoreRequisitionComponent />;
}

export const Component = StoreRequisitionPage;
