import { addDays } from "@/lib/date-utils";
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
    const today = new Date().toISOString();
    return {
      sr_date: today,
      // ตั้งต้นเป็นพรุ่งนี้ — เบิกวันนี้ของถึงเร็วสุดคือวันรุ่งขึ้น
      expected_date: addDays(today, 1),
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
        product_local_name: d.product_local_name ?? "",
        unit_name: d.inventory_unit_name ?? "",
        description: d.description ?? "",
        requested_qty: d.requested_qty,
        approved_qty: d.approved_qty ?? 0,
        issued_qty: d.issued_qty ?? 0,
        current_stage_status: d.current_stage_status ?? "pending",
        stage_status: "",
        _initial_stage_status: d.current_stage_status ?? "pending",
        stage_message: "",
        history: d.history ?? [],
      })) ?? [],
  };
}

/**
 * ค่าเริ่มต้นของฟอร์มตอน duplicate ใบเดิม — semantics เดียวกับ Duplicate ของ PR:
 * ตั้งต้นจากฟอร์มเปล่า (วันที่วันนี้/พรุ่งนี้ requestor เป็นคนกดก๊อป) แล้ว copy
 * "ของที่เบิก" จากใบเดิม (notes/workflow/แผนก/คลังต้นทาง-ปลายทาง + รายการสินค้า
 * กับจำนวนที่ขอ) ทิ้งของที่ผูกกับรอบเดิมทั้งหมด: item id/doc_version, จำนวนที่
 * อนุมัติ/จ่ายจริง, สถานะ stage — ใบใหม่ต้องเริ่มรอบ workflow ของตัวเอง
 */
export function buildSrDuplicateValues(
  storeRequisition: StoreRequisition,
  defaultRequestorId: string,
  defaultDepartmentId: string,
): SrFormValues {
  const blank = buildSrDefaultValues(
    undefined,
    defaultRequestorId,
    defaultDepartmentId,
  );
  return {
    ...blank,
    description: storeRequisition.description ?? "",
    workflow_id: storeRequisition.workflow_id ?? "",
    department_id: storeRequisition.department_id ?? defaultDepartmentId,
    from_location_id: storeRequisition.from_location_id ?? "",
    to_location_id: storeRequisition.to_location_id ?? "",
    items:
      storeRequisition.store_requisition_detail?.map((d) => ({
        product_id: d.product_id,
        product_name: d.product_name,
        product_local_name: d.product_local_name ?? "",
        unit_name: d.inventory_unit_name ?? "",
        description: d.description ?? "",
        requested_qty: d.requested_qty,
        approved_qty: 0,
        issued_qty: 0,
        current_stage_status: "pending",
        stage_status: "",
        _initial_stage_status: "pending",
        stage_message: "",
      })) ?? [],
  };
}

/**
 * ยอดเงินของรายการ SR
 *
 * backend ยังไม่ส่งราคาต่อหน่วยมากับ store_requisition_detail เลยคง 0 ไว้ก่อน
 * ทั้งคอลัมน์ amount ในตารางและยอดรวมท้ายฟอร์มเรียกตัวนี้ตัวเดียว — วันไหนมีราคา
 * มาแล้วแก้ที่นี่จุดเดียว ยอดในตารางกับยอดรวมจะไม่หลุดกันเอง (บทเรียนจาก PO)
 */
export function srItemAmount(_item: SrFormValues["items"][number]): number {
  return 0;
}

/** ยอดรวมทั้งใบ = ผลรวม srItemAmount ของทุกแถว */
export function srGrandTotal(items: SrFormValues["items"]): number {
  return items.reduce((sum, item) => sum + srItemAmount(item), 0);
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
