import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { BookOpen, Hotel, ShoppingCart } from "lucide-react";
import type { LucideIcon } from "../landing-types";

export type BrandDef = {
  readonly key: string;
  readonly configKey: string;
  readonly form?: LazyExoticComponent<ComponentType>;
};

export type InterfaceCategoryDef = {
  readonly key: string;
  readonly icon: LucideIcon;
  readonly brands: readonly BrandDef[];
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
    brands: [
      {
        key: "carmen_gl",
        configKey: "interface_accounting_carmen_gl",
        // Carmen 4 legacy — field set ต่างจาก accounting ทั่วไป (ดู spec 2026-07-22)
        form: lazy(() => import("./carmen-gl-interface-form")),
      },
      ...brands("accounting", ["blueledgers", "external"]),
    ],
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

export function findCategory(
  key: string | undefined,
): InterfaceCategoryDef | undefined {
  return INTERFACE_CATEGORIES.find((def) => def.key === key);
}

export function findBrand(
  categoryKey: string | undefined,
  brandKey: string | undefined,
): BrandDef | undefined {
  return findCategory(categoryKey)?.brands.find((b) => b.key === brandKey);
}
