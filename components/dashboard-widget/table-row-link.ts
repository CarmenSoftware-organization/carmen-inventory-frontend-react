import type { TableData } from "@/types/dashboard-widget";

/**
 * dataset ที่แถวชี้ไปหาเอกสารได้ → path ของหน้ารายละเอียด
 *
 * map อยู่ฝั่ง frontend ไม่ใช่ backend โดยตั้งใจ — micro-data ไม่ควรรู้จัก route
 * ของหน้าเว็บ ไม่งั้นเปลี่ยน path ทีต้อง deploy backend ตาม มันส่งมาแค่ `id`
 */
const DOC_ROUTES: Record<string, string> = {
  "document.pr-table": "/procurement/purchase-request",
  "document.pr-sent-back": "/procurement/purchase-request",
  "document.pr-rejected": "/procurement/purchase-request",
  "document.po-sent-back": "/procurement/purchase-order",
  "document.po-rejected": "/procurement/purchase-order",
  "document.sr-sent-back": "/store-operation/store-requisition",
  "document.sr-rejected": "/store-operation/store-requisition",
  // ranked ของเอกสาร — คลิกได้เมื่อสลับเป็นตาราง (id มาใน extras แล้ว `asTableData`
  // ยกขึ้นเป็นคอลัมน์ id ให้)
  "procurement.slowest-pr-approvals": "/procurement/purchase-request",
  "procurement.slowest-po-approvals": "/procurement/purchase-order",
  "workflow.my-pending-pr": "/procurement/purchase-request",
};

/** คีย์ของคอลัมน์ที่ถือ id (type `id`) — ไม่มี = แถวนี้ลิงก์ไม่ได้ */
export function idColumnKey(data: TableData | null): string | null {
  return data?.columns.find((c) => c.type === "id")?.key ?? null;
}

/**
 * path ของเอกสารในแถวนั้น
 *
 * @param datasetId - dataset ของ widget
 * @param row - แถวที่ถูกคลิก
 * @param key - คีย์ของคอลัมน์ id
 * @returns path หรือ null เมื่อ dataset นี้ไม่มีหน้าปลายทาง หรือแถวไม่มี id
 */
export function docHref(
  datasetId: string,
  row: Record<string, unknown>,
  key: string | null,
): string | null {
  const base = DOC_ROUTES[datasetId];
  if (!base || !key) return null;
  const id = row[key];
  return typeof id === "string" && id.length > 0
    ? `${base}/${encodeURIComponent(id)}`
    : null;
}
