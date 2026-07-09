/**
 * รายการ config ที่ frontend "seed" — แสดงเสมอแม้ backend ยังไม่มีค่า
 * (default = defaultValue) พอ user เปิดแล้ว save ค่าจะถูกเขียนลง backend
 */
export interface SeededConfigItem {
  /** key จริงที่ backend ใช้ */
  key: string;
  /** ชนิดข้อมูล — "boolean" → ConfigField render เป็น Switch */
  datatype: string;
  /** ค่าเริ่มต้น (string เสมอ ตาม BusinessUnitConfigItem) */
  defaultValue: string;
  /** label canonical (EN) ที่ persist ลง backend — locale-independent กัน false-dirty */
  label: string;
  /** i18n key สำหรับ "แสดงผล" (relative ต่อ namespace businessSetting) */
  labelKey: string;
}

/** section ที่จัดกลุ่ม seeded config items */
export interface ConfigSection {
  /** id ภายใน (ไม่แสดงผล) */
  id: string;
  /** i18n key ของหัวข้อ (relative ต่อ businessSetting) */
  titleKey: string;
  /** i18n key ของคำอธิบาย */
  descKey: string;
  items: SeededConfigItem[];
}

/** registry ของ config ที่ frontend seed จัดกลุ่มตาม section */
export const CONFIG_SECTIONS: readonly ConfigSection[] = [
  {
    id: "pr",
    titleKey: "sections.pr",
    descKey: "sections.prDesc",
    items: [
      {
        key: "pr.allow-duplicate.product",
        datatype: "boolean",
        defaultValue: "false",
        label: "Allow selecting duplicate products",
        labelKey: "config.prAllowDuplicateProduct",
      },
    ],
  },
];

/** seeded items ทั้งหมด flatten จากทุก section */
export const SEEDED_ITEMS: readonly SeededConfigItem[] =
  CONFIG_SECTIONS.flatMap((s) => s.items);

/** เซ็ตของ key ที่ registry เป็นเจ้าของ (ใช้ partition ตอน render) */
export const SEEDED_KEYS: ReadonlySet<string> = new Set(
  SEEDED_ITEMS.map((i) => i.key),
);
