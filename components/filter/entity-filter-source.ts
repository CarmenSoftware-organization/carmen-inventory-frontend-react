import type { LookupListHook } from "@/hooks/use-entities-by-ids";
import { ACTIVE_ONLY_FILTER } from "@/hooks/use-lookup-pagination";

/**
 * แหล่งรายการของตัวกรองหน้า list แบบเลือกหลายค่าจากทะเบียน (control `"entity"`)
 * — ค้นที่ server, โหลดทีละหน้า และชื่อของค่าที่เลือกไว้ดึงตาม id
 */
export interface EntityFilterSource<T> {
  /** คอลัมน์ใน clause — ค่า URL เป็น `<fieldKey>|string:id1,id2` */
  readonly fieldKey: string;
  readonly useListHook: LookupListHook<T>;
  /** default (x) => x.id */
  readonly getId?: (item: T) => string;
  readonly getLabel: (item: T) => string;
  /** คอลัมน์ id ฝั่ง backend ตอนดึงตาม id — users = "user_id", currency code = "code" */
  readonly idFilterKey?: string;
  /** default ACTIVE_ONLY_FILTER; ส่ง null เพื่อไม่กรอง */
  readonly serverFilter?: string | null;
  /**
   * ค่า URL เป็น id คั่น `,` เปล่า ๆ ไม่มี `<fieldKey>|string:` นำหน้า — หน้า log
   * ส่งค่าเป็น query param แยก (`actor_id=a,b`) ไม่ใช่ clause ของ `filter`
   */
  readonly bareIds?: boolean;
}

// FilterFieldDef ถือ source ของหลายชนิดปนกันในอาร์เรย์เดียว — ลบ T ทิ้งตรงนี้จุดเดียว
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEntityFilterSource = EntityFilterSource<any>;

/** ประกาศ source โดยให้ TS ตรวจ getId/getLabel กับ T ครบ แล้วคืนรูปที่ FilterFieldDef รับ */
export function defineEntitySource<T>(
  source: EntityFilterSource<T>,
): AnyEntityFilterSource {
  return source;
}

const defaultGetId = (item: { id: string }) => item.id;

export function entityGetId(source: AnyEntityFilterSource) {
  return source.getId ?? defaultGetId;
}

export function entityServerFilter(
  source: AnyEntityFilterSource,
): string | undefined {
  if (source.serverFilter === undefined) return ACTIVE_ONLY_FILTER;
  return source.serverFilter ?? undefined;
}
