import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { BookOpen, Hotel, ShoppingCart } from "lucide-react";
import type { LucideIcon } from "../landing-types";

/**
 * brand หนึ่งตัวใต้ category — เช่น Micros ใต้ POS
 *
 * แต่ละ brand ตั้งค่าแยกกัน มี row ของตัวเองใน app_config
 */
export type BrandDef = {
  /** route param — `/system-admin/interface/:category/:brand` */
  readonly key: string;
  /** key ของ row ใน app_config — `interface_<category>_<brand>` */
  readonly configKey: string;
};

/**
 * category ที่รวม brand หลายตัวที่ใช้ form เดียวกัน — เช่น POS ที่มี Micros / Infrasys / Square
 */
export type InterfaceCategoryDef = {
  /** route param — `/system-admin/interface/:category` */
  readonly key: string;
  readonly icon: LucideIcon;
  readonly brands: readonly BrandDef[];
  /** form เดียวต่อ category — brand มาจาก route param ไม่ใช่ dropdown */
  readonly form: LazyExoticComponent<ComponentType>;
};

function brands(
  category: string,
  keys: readonly string[],
): readonly BrandDef[] {
  return keys.map((key) => ({
    key,
    configKey: `interface_${category}_${key}`,
  }));
}

/**
 * รายการ interface ทั้งหมด สองชั้น — category ถือ brand, brand ถือ config
 *
 * registry เก็บแค่ metadata (route key, config key, icon, form) ไม่เก็บ field/schema —
 * แต่ละ category ถือ form + schema ของตัวเอง เพราะหน้าตาต่างกันจริง ดู
 * docs/superpowers/specs/2026-07-16-interface-brands-visibility-design.md
 *
 * เพิ่ม brand = เพิ่ม key ใน brands() ของ category นั้น + i18n label + secret path ฝั่ง backend
 * เพิ่ม category = เพิ่ม entry ที่นี่ + สร้างไฟล์ form หนึ่งไฟล์
 */
export const INTERFACE_CATEGORIES: readonly InterfaceCategoryDef[] = [
  {
    key: "accounting",
    icon: BookOpen,
    brands: brands("accounting", ["carmen_gl", "blueledgers", "external"]),
    form: lazy(() => import("./accounting-interface-form")),
  },
  {
    key: "pos",
    icon: ShoppingCart,
    brands: brands("pos", ["micros", "infrasys", "square"]),
    form: lazy(() => import("./pos-interface-form")),
  },
  {
    key: "pms",
    icon: Hotel,
    brands: brands("pms", ["opera", "protel"]),
    form: lazy(() => import("./pms-interface-form")),
  },
];

/**
 * หา category จาก route param
 *
 * @param key - ค่าจาก `useParams().category`
 * @returns InterfaceCategoryDef หรือ undefined ถ้าไม่รู้จัก (caller ควรโชว์ NotFound)
 */
export function findCategory(
  key: string | undefined,
): InterfaceCategoryDef | undefined {
  return INTERFACE_CATEGORIES.find((def) => def.key === key);
}

/**
 * หา brand จาก route param ทั้งคู่
 *
 * @param categoryKey - ค่าจาก `useParams().category`
 * @param brandKey - ค่าจาก `useParams().brand`
 * @returns BrandDef หรือ undefined ถ้า category/brand ไม่รู้จัก
 */
export function findBrand(
  categoryKey: string | undefined,
  brandKey: string | undefined,
): BrandDef | undefined {
  return findCategory(categoryKey)?.brands.find((b) => b.key === brandKey);
}
