import type { LocalizedTitle } from "@/types/dashboard-widget";

export interface WidgetTitleSource {
  readonly dataset_id: string;
  readonly title?: string | null;
  readonly title_i18n?: LocalizedTitle | null;
}

/**
 * title ที่มีคนตั้งเองจริง ๆ — null = ใช้ชื่อตั้งต้นของ dataset
 *
 * widget รุ่นก่อนถูกบันทึก `title = ชื่อ dataset` (ภาษาอังกฤษ) ตอนสร้างทุกใบ แล้ว migration
 * backfill เป็น `{ en: ชื่อ dataset }` — ค่าที่เท่ากับชื่อ dataset ตรงตัวและไม่มีภาษาอื่น
 * จึงถือว่า "ระบบแช่ไว้" ไม่ใช่ชื่อที่ผู้ใช้ตั้ง ไม่งั้นหน้าไทยจะติดชื่ออังกฤษตลอดไป
 */
export function customWidgetTitle(
  widget: WidgetTitleSource,
  datasetName?: string,
): LocalizedTitle | null {
  const en = widget.title_i18n?.en?.trim() || widget.title?.trim() || "";
  const th = widget.title_i18n?.th?.trim() || undefined;
  if (!en) return null;
  if (!th && en === datasetName) return null;
  return th ? { en, th } : { en };
}

/**
 * ชื่อที่จะแสดง: ชื่อที่ตั้งเองตาม locale → ชื่อที่ตั้งเอง (en) → ชื่อ dataset ที่แปลแล้ว
 * → ชื่อ dataset จาก catalogue → dataset_id
 */
export function resolveWidgetTitle(
  widget: WidgetTitleSource,
  opts: {
    readonly locale: string;
    readonly datasetName?: string;
    readonly translatedDatasetName?: string;
  },
): string {
  const custom = customWidgetTitle(widget, opts.datasetName);
  if (custom) {
    return custom[opts.locale as keyof LocalizedTitle] || custom.en;
  }
  return opts.translatedDatasetName || opts.datasetName || widget.dataset_id;
}
