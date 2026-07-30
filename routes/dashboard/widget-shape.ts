import {
  getWidgetsForShape,
  type DatasetParam,
  type DatasetShape,
  type WidgetParams,
  type WidgetType,
} from "@/types/dashboard-widget";

/** Shapes ที่ frontend render ได้ (มี Card component) — `matrix` ยังไม่มี */
export const SUPPORTED_SHAPES = [
  "scalar",
  "scalar_delta",
  "time_series",
  "categorical",
  "ranked",
  "table",
] as const satisfies readonly DatasetShape[];

/**
 * Widget type เริ่มต้นของแต่ละ shape — ตัวแรกใน SUPPORTED_WIDGETS
 * scalar/scalar_delta→kpi, time_series→line, categorical→pie, ranked→bar
 */
export function inferWidgetTypeFromShape(shape: string): WidgetType {
  return getWidgetsForShape(shape as DatasetShape)[0] ?? "kpi";
}

/** ค่าเริ่มต้นของ params จาก descriptor (`default`) */
export function defaultParamsFor(
  params: readonly DatasetParam[] = [],
): WidgetParams {
  const out: WidgetParams = {};
  for (const p of params) {
    if (p.default !== undefined) out[p.name] = p.default;
  }
  return out;
}

/**
 * Radix SelectItem ห้าม value="" — param ที่ไม่บังคับและใช้ "" แปลว่า "ทั้งหมด"
 * (เช่น status) จึงต้องมี sentinel แล้ว map กลับเป็น "" ตอนส่งขึ้น API
 */
export const PARAM_EMPTY = "__all__";

/**
 * ควรโชว์ตัวเลือก "ทั้งหมด" (ค่าว่าง) ในดรอปดาวน์ของ param นี้ไหม
 * โชว์เมื่อ param ไม่บังคับ และไม่มี default ที่มีความหมาย ("" นับเป็นไม่มี) —
 * เช่น `status` (default "" = ทั้งหมด) โชว์ได้; ส่วน `time_range` ที่มี default
 * `@1month` เป็น token ที่ต้องมีค่าเสมอ (backend ตีความ "" กลับเป็น default อยู่ดี)
 * จึงไม่ควรมี "ทั้งหมด" ให้เลือก
 */
export function shouldShowAllOption(p: DatasetParam): boolean {
  return !p.required && (p.default === undefined || p.default === "");
}

/** module ของ dataset — ใช้เลือกสี/ไอคอน AppTile */
export function inferModuleName(datasetId: string): string {
  const prefix = datasetId.split(".")[0];
  if (prefix === "inventory") return "inventoryManagement";
  return "procurement";
}

/** เดา sub-tile จากชื่อ dataset — ใช้เลือกไอคอนบนการ์ด */
export function inferSubTile(datasetId: string): string {
  if (datasetId.includes("physical-count")) return "physicalCount";
  if (datasetId.includes("spot-check")) return "spotCheck";
  if (datasetId.includes("store-requisition") || datasetId.includes("sr-"))
    return "storeRequisition";
  if (datasetId.includes("low-stock")) return "stockReplenishment";
  if (datasetId.includes("stock-in") || datasetId.includes("stock-out"))
    return "transaction";
  if (datasetId.includes("pr-by-department")) return "department";
  if (datasetId.includes("by-vendor")) return "vendor";
  if (datasetId.includes("pr-")) return "purchaseRequest";
  if (datasetId.includes("po-")) return "purchaseOrder";
  if (datasetId.includes("grn")) return "goodsReceiveNote";
  if (datasetId.includes("cn-")) return "creditNote";
  return "document";
}
