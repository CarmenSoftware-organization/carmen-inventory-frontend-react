import { printFormConfigKey } from "@/lib/print-form-config";
import type { PrintDocumentType } from "@/lib/print-document";
import type { BusinessUnitConfigItem } from "@/types/business-unit";

/** option ของ enum config (datatype "enum") */
export interface ConfigOption {
  /** ค่าที่เก็บ (canonical snake_case, locale-independent) */
  value: string;
  /** i18n key ของ label option (relative ต่อ defaultSetting) */
  labelKey: string;
  /** แสดง option นี้เฉพาะเมื่อ BU.calculation_method === ค่านี้ (undefined = แสดงเสมอ) */
  visibleWhenCalcMethod?: string;
}

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
  /** i18n key สำหรับ "แสดงผล" (relative ต่อ namespace defaultSetting) */
  labelKey: string;
  /** สำหรับ datatype "enum" — รายการ option ตามลำดับที่แสดง */
  options?: ConfigOption[];
  /**
   * สำหรับ enum ที่ options มาจาก report-template API (ไม่ใช่ static `options`)
   * ค่าคือ `report_group` ที่ใช้กรอง เช่น "PR" — ใช้พร้อม `options` ไม่ได้
   */
  optionsGroup?: string;
}

/** section ที่จัดกลุ่ม seeded config items */
export interface ConfigSection {
  /** id ภายใน (ไม่แสดงผล) */
  id: string;
  /** i18n key ของหัวข้อ (relative ต่อ defaultSetting) */
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
  {
    id: "si",
    titleKey: "sections.si",
    descKey: "sections.siDesc",
    items: [
      {
        key: "si.cost-from",
        datatype: "enum",
        defaultValue: "last_cost",
        label: "Default price for added items",
        labelKey: "config.siCostFrom",
        options: [
          {
            value: "average",
            labelKey: "config.siCostFromOptions.average",
            visibleWhenCalcMethod: "average",
          },
          {
            value: "last_receiving",
            labelKey: "config.siCostFromOptions.lastReceiving",
          },
          {
            value: "last_cost",
            labelKey: "config.siCostFromOptions.lastCost",
          },
        ],
      },
    ],
  },
  {
    id: "po",
    titleKey: "sections.po",
    descKey: "sections.poDesc",
    items: [
      {
        key: "po.group-by-pr-comment",
        datatype: "boolean",
        defaultValue: "false",
        label: "Group by PR comment",
        labelKey: "config.poGroupByPrComment",
      },
    ],
  },
  {
    id: "printForm",
    titleKey: "sections.printForm",
    descKey: "sections.printFormDesc",
    items: (
      [
        ["PR", "PR - Purchase Request", "config.printFormPr"],
        ["PO", "PO - Purchase Order", "config.printFormPo"],
        ["GRN", "GRN - Good Received Note", "config.printFormGrn"],
        ["SR", "SR - Store Requisition", "config.printFormSr"],
        ["CN", "CN - Credit Note", "config.printFormCn"],
        ["SI", "SI - Stock In", "config.printFormSi"],
        ["SO", "SO - Stock Out", "config.printFormSo"],
        ["IA", "IA - Inventory Adjustment", "config.printFormIa"],
        ["PC", "PC - Physical Count", "config.printFormPc"],
        ["SC", "SC - Spot Check", "config.printFormSc"],
        ["RFP", "RFP - Request For Pricing", "config.printFormRfp"],
        ["EOP", "EOP - End Of Period", "config.printFormEop"],
      ] as [PrintDocumentType, string, string][]
    ).map(([type, label, labelKey]) => ({
      key: printFormConfigKey(type),
      datatype: "enum",
      defaultValue: "",
      label,
      labelKey,
      optionsGroup: type,
    })),
  },
];

/** seeded items ทั้งหมด flatten จากทุก section */
export const SEEDED_ITEMS: readonly SeededConfigItem[] =
  CONFIG_SECTIONS.flatMap((s) => s.items);

/** เซ็ตของ key ที่ registry เป็นเจ้าของ (ใช้ partition ตอน render) */
export const SEEDED_KEYS: ReadonlySet<string> = new Set(
  SEEDED_ITEMS.map((i) => i.key),
);

/** entry ของ config ใน section — เก็บ absolute index (สำหรับ RHF path) + labelKey */
export interface ConfigSectionEntry {
  item: BusinessUnitConfigItem;
  /** index ใน merged config array — ใช้กับ RHF path `config.${index}.value` */
  index: number;
  /** i18n key สำหรับ display label (จาก registry) */
  labelKey: string;
  /** สำหรับ enum — options จาก registry (undefined = ไม่ใช่ enum) */
  options?: ConfigOption[];
  /** สำหรับ enum ที่ options มาจาก API — report_group ที่ใช้กรอง */
  optionsGroup?: string;
}

/** entry ของ config ที่ไม่อยู่ใน registry section (backend-only) */
export interface ConfigOtherEntry {
  item: BusinessUnitConfigItem;
  index: number;
}

/** section ที่พร้อม render (มี entry อย่างน้อย 1) */
export interface ConfigRenderSection {
  id: string;
  titleKey: string;
  descKey: string;
  entries: ConfigSectionEntry[];
}

/** ผลของการจัดกลุ่ม config เพื่อ render */
export interface ConfigRenderGroups {
  /** section จาก registry ที่มี entry (ตามลำดับ registry) */
  sections: ConfigRenderSection[];
  /** items ที่ไม่อยู่ใน registry section → section "Configuration" เดิม */
  other: ConfigOtherEntry[];
}

/**
 * จัดกลุ่ม merged config items เพื่อ render
 *
 * คำนวณ absolute index ก่อน partition เพราะ RHF ผูกด้วย `config.${index}.value`
 * ที่ต้องอ้าง index ใน merged array (ไม่ใช่ index หลัง filter)
 *
 * @param items - merged config array (จาก mergeSeededConfig)
 * @returns กลุ่ม section (registry) + other (backend-only)
 */
export function groupConfigForRender(
  items: readonly BusinessUnitConfigItem[],
): ConfigRenderGroups {
  const indexed = items.map((item, index) => ({ item, index }));

  const sections: ConfigRenderSection[] = CONFIG_SECTIONS.map((section) => {
    const entries: ConfigSectionEntry[] = [];
    for (const seeded of section.items) {
      const found = indexed.find((e) => e.item.key === seeded.key);
      if (found) {
        entries.push({
          ...found,
          labelKey: seeded.labelKey,
          options: seeded.options,
          optionsGroup: seeded.optionsGroup,
        });
      }
    }
    return {
      id: section.id,
      titleKey: section.titleKey,
      descKey: section.descKey,
      entries,
    };
  }).filter((s) => s.entries.length > 0);

  const other: ConfigOtherEntry[] = indexed.filter(
    (e) => !SEEDED_KEYS.has(e.item.key),
  );

  return { sections, other };
}

/**
 * คืน options ที่ควรแสดงใน dropdown — ตัด option ที่มี visibleWhenCalcMethod
 * ไม่ตรงกับ calculationMethod ยกเว้น option ที่ value === currentValue
 * (คงค่าที่ backend เก็บไว้ ไม่ทำข้อมูลหาย)
 *
 * @param options - จาก registry (ConfigOption[])
 * @param calculationMethod - BU.calculation_method (อาจเป็น null)
 * @param currentValue - ค่าปัจจุบันของ config item
 */
export function resolveConfigOptions(
  options: readonly ConfigOption[],
  calculationMethod: string | null | undefined,
  currentValue: string,
): ConfigOption[] {
  return options.filter(
    (o) =>
      !o.visibleWhenCalcMethod ||
      o.visibleWhenCalcMethod === calculationMethod ||
      o.value === currentValue,
  );
}
