import type { StoreRequisition } from "@/types/store-requisition";
import type { SrFormValues } from "./sr-form-schema";

/**
 * สร้าง default values สำหรับ react-hook-form ของ SR
 * - ถ้ามี storeRequisition → แปลงจาก server response
 * - ถ้าไม่มี → สร้าง form เปล่า รอ user กรอก (โหมด add)
 */
export function buildSrDefaultValues(
  storeRequisition: StoreRequisition | undefined,
  defaultRequestorId: string,
  defaultDepartmentId: string,
): SrFormValues {
  if (!storeRequisition) {
    return {
      sr_date: new Date().toISOString(),
      expected_date: "",
      description: "",
      workflow_id: "",
      requestor_id: defaultRequestorId,
      department_id: defaultDepartmentId,
      from_location_id: "",
      to_location_id: "",
      items: [],
    };
  }
  return {
    doc_version: storeRequisition.doc_version,
    sr_date: storeRequisition.sr_date ?? "",
    expected_date: storeRequisition.expected_date ?? "",
    description: storeRequisition.description ?? "",
    workflow_id: storeRequisition.workflow_id ?? "",
    requestor_id: storeRequisition.requestor_id ?? defaultRequestorId,
    department_id: storeRequisition.department_id ?? defaultDepartmentId,
    from_location_id: storeRequisition.from_location_id ?? "",
    to_location_id: storeRequisition.to_location_id ?? "",
    items:
      storeRequisition.store_requisition_detail?.map((d) => ({
        id: d.id,
        doc_version: d.doc_version,
        product_id: d.product_id,
        product_name: d.product_name,
        unit_name: d.inventory_unit_name ?? "",
        description: d.description ?? "",
        requested_qty: d.requested_qty,
        approved_qty: d.approved_qty ?? 0,
        issued_qty: d.issued_qty ?? 0,
        current_stage_status: d.current_stage_status ?? "pending",
        stage_status: "",
        stage_message: "",
      })) ?? [],
  };
}

/**
 * Map item form value → payload ที่ส่ง backend
 */
export function mapSrItemToPayload(item: SrFormValues["items"][number]) {
  return {
    ...(item.doc_version != null ? { doc_version: item.doc_version } : {}),
    product_id: item.product_id,
    description: item.description,
    requested_qty: item.requested_qty,
    approved_qty: item.approved_qty,
    issued_qty: item.issued_qty,
    current_stage_status: item.current_stage_status || "pending",
  };
}
