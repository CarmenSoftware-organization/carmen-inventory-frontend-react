import type { FilterFieldDef } from "@/types/list-filter";

/**
 * ตัวกรองของหน้ารายการเหตุผลใบลดหนี้ — หน้านี้ไม่มี status filter เลย (เดิมส่ง
 * `hideStatusFilter`) จึงไม่มี field ใดใน registry เลย มีแค่ saved views + sort
 */
export const CREDIT_NOTE_REASON_FILTER_FIELDS: FilterFieldDef[] = [];
