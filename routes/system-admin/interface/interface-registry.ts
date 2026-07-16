import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { BookOpen, Hotel, ShoppingCart } from "lucide-react";
import type { LucideIcon } from "../landing-types";

export type InterfaceDef = {
  /** route param — `/system-admin/interface/:key` */
  readonly key: string;
  /** key ของ row ใน app_config */
  readonly configKey: string;
  readonly icon: LucideIcon;
  readonly form: LazyExoticComponent<ComponentType>;
};

/**
 * รายการ interface ทั้งหมด — เก็บแค่ metadata ของ list ไม่เก็บ field/schema
 *
 * แต่ละ interface ถือ form + schema ของตัวเอง เพราะหน้าตาต่างกันจริง และตัวที่จะเพิ่ม
 * ทีหลังอาจต้องการ UI ที่ต่างออกไปมาก (เช่น mapping table) — ดู
 * docs/superpowers/specs/2026-07-16-interfaces-config-design.md
 *
 * เพิ่ม interface ใหม่ = เพิ่ม entry ที่นี่ + สร้างไฟล์ form หนึ่งไฟล์
 * ถ้า interface นั้นมีค่าลับ ต้องเพิ่ม path ใน `secretPathsByKey` ฝั่ง backend ด้วย
 */
export const INTERFACES: readonly InterfaceDef[] = [
  {
    key: "accounting",
    configKey: "interface_accounting",
    icon: BookOpen,
    form: lazy(() => import("./accounting-interface-form")),
  },
  {
    key: "pos",
    configKey: "interface_pos",
    icon: ShoppingCart,
    form: lazy(() => import("./pos-interface-form")),
  },
  {
    key: "pms",
    configKey: "interface_pms",
    icon: Hotel,
    form: lazy(() => import("./pms-interface-form")),
  },
];

/**
 * หา interface จาก route param
 *
 * @param key - ค่าจาก `useParams().key`
 * @returns InterfaceDef หรือ undefined ถ้าไม่รู้จัก (caller ควรโชว์ NotFound)
 */
export function findInterface(key: string | undefined): InterfaceDef | undefined {
  return INTERFACES.find((def) => def.key === key);
}
