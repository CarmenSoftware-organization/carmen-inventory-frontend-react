import {
  ChefHat,
  Files,
  Handshake,
  LayoutDashboard,
  LayoutGrid,
  Package,
  Settings2,
  Shield,
  ShoppingCart,
  Store,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

/**
 * catalog กลางของหน้าจอสิทธิ์ — ทั้ง `PermissionPicker` (จอ) และ `useRolePrint`
 * (พิมพ์) จัดกลุ่มด้วยฟังก์ชันเดียวกัน จะได้ไม่มีวันแสดงคนละชุด
 */

const STANDARD_ACTIONS = ["view", "create", "update", "delete"] as const;
const EXTENDED_ACTIONS = [
  "view_department",
  "view_all",
  "execute",
  "commit",
  "manage_bu",
] as const;

/** ลำดับการเรียง action ในแต่ละแถว — CRUD ก่อน แล้วค่อย scope/workflow */
export const MAIN_ACTIONS = [...STANDARD_ACTIONS, ...EXTENDED_ACTIONS] as const;

export const ACTION_TKEY: Record<string, string> = {
  view: "actionView",
  view_department: "actionViewDept",
  view_all: "actionViewAll",
  create: "actionCreate",
  update: "actionUpdate",
  delete: "actionDelete",
  execute: "actionExecute",
  manage_bu: "actionManageBu",
  commit: "actionCommit",
};

interface CategoryMeta {
  readonly tkey: string;
  readonly icon: LucideIcon;
}

// ชื่อ/ไอคอนต้องตรงกับ sidebar (constant/module-list.ts) — wayfinding เดียวกันทั้งแอป
// ลำดับของ key ที่นี่คือลำดับที่แสดงบนจอด้วย (API ส่งมาไม่เรียง)
export const CATEGORY_META: Record<string, CategoryMeta> = {
  dashboard: { tkey: "catDashboard", icon: LayoutDashboard },
  procurement: { tkey: "catProcurement", icon: ShoppingCart },
  store_operations: { tkey: "catStoreOperations", icon: Store },
  inventory_management: { tkey: "catInventory", icon: Warehouse },
  product_management: { tkey: "catProduct", icon: Package },
  vendor_management: { tkey: "catVendor", icon: Handshake },
  operation_plan: { tkey: "catOperationPlan", icon: ChefHat },
  report: { tkey: "catReport", icon: Files },
  configuration: { tkey: "catConfig", icon: Settings2 },
  system_admin: { tkey: "catSystemAdmin", icon: Shield },
  widget: { tkey: "catWidget", icon: LayoutGrid },
};

export const DEFAULT_CATEGORY_META: CategoryMeta = CATEGORY_META.configuration;

const CATEGORY_ORDER = Object.keys(CATEGORY_META);

/**
 * สิทธิ์ที่ผูกกับตัวโมดูลเอง ไม่ใช่ resource ย่อย (`resource: "procurement"`) —
 * backend มีอยู่ 11 ตัวและมันคือสิทธิ์ "เห็นเมนูโมดูลนี้ไหม" ซึ่งขาดไม่ได้
 * ใช้ค่าว่างเป็น key เพื่อให้จัดเรียงขึ้นก่อน resource อื่นเสมอ
 */
export const MODULE_RESOURCE_KEY = "";

/** แถวหนึ่งในตาราง = resource หนึ่งตัว พร้อม action ที่ backend มีจริงเท่านั้น */
export interface GroupedResource {
  /** ค่า resource เต็มจาก API เช่น `procurement.credit_note` */
  resource: string;
  /** ส่วนหลังจุด — ค่าว่างแปลว่าเป็นสิทธิ์ระดับโมดูล */
  resourceKey: string;
  category: string;
  /** action → permission id */
  actions: Map<string, string>;
}

export interface PermissionGroup {
  category: string;
  resources: GroupedResource[];
}

/** รูปร่างเท่าที่หน้าจอนี้ต้องใช้จาก `GET /permissions` */
export interface PermissionRecord {
  id: string;
  resource: string;
  action: string;
  audit?: { deleted?: { at?: string } | null } | null;
}

export function titleCase(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * ลำดับ key ที่ใช้หา label ของ resource — ตัวเจาะจง category ก่อน แล้วค่อยตัวกลาง
 * (`category` มีทั้งใน product_management และ operation_plan แต่คนละความหมาย)
 */
export function resourceLabelKeys(
  category: string,
  resourceKey: string,
): string[] {
  return [`${category}_${resourceKey}`, resourceKey];
}

/** เรียง action ตามลำดับบนจอ — ตัวที่ไม่รู้จักไปต่อท้าย ไม่ถูกทิ้ง */
export function actionOrder(action: string): number {
  const i = (MAIN_ACTIONS as readonly string[]).indexOf(action);
  return i === -1 ? MAIN_ACTIONS.length : i;
}

/** action ของ resource นั้นเรียงตามลำดับบนจอ (รวมตัวที่ไม่อยู่ใน MAIN_ACTIONS) */
export function sortedActions(resource: GroupedResource): string[] {
  return Array.from(resource.actions.keys()).sort(
    (a, b) => actionOrder(a) - actionOrder(b),
  );
}

export function getResourceIds(resource: GroupedResource): string[] {
  return Array.from(resource.actions.values());
}

export function getCategoryIds(group: PermissionGroup): string[] {
  const ids: string[] = [];
  for (const r of group.resources) {
    for (const id of r.actions.values()) ids.push(id);
  }
  return ids;
}

function categoryRank(category: string): number {
  const i = CATEGORY_ORDER.indexOf(category);
  return i === -1 ? CATEGORY_ORDER.length : i;
}

/**
 * จัดกลุ่มสิทธิ์ดิบจาก API เป็น category → resource → action
 *
 * - **ข้ามสิทธิ์ที่ถูกลบไปแล้ว** (`audit.deleted`) — backend ยังส่งมาด้วย ปล่อยไว้
 *   จะได้ทั้งหมวดที่กดติ๊กแล้วไม่มีผลอะไร (เช่น widget) และของซ้ำที่ id ผิดตัว
 * - **เก็บสิทธิ์ระดับโมดูล** (resource ไม่มีจุด) ไว้เป็นแถวแรกของหมวดนั้น
 * - เรียงหมวดตาม `CATEGORY_META` และเรียง resource ตามชื่อ เพื่อให้หน้าจอนิ่ง
 *   ไม่ขึ้นกับลำดับที่ API ส่งมา
 *
 * @param permissions - ผลลัพธ์ `data` จาก `GET /permissions?perpage=-1`
 * @param labelOf - ตัวแปลงชื่อ resource เป็นข้อความที่แสดง (ใช้เรียงลำดับ)
 */
export function groupPermissions(
  permissions: readonly PermissionRecord[],
  labelOf: (r: GroupedResource) => string,
): PermissionGroup[] {
  const byCategory = new Map<string, Map<string, Map<string, string>>>();

  for (const perm of permissions) {
    if (perm.audit?.deleted) continue;
    const dot = perm.resource.indexOf(".");
    const category = dot === -1 ? perm.resource : perm.resource.slice(0, dot);
    const resourceKey =
      dot === -1 ? MODULE_RESOURCE_KEY : perm.resource.slice(dot + 1);
    if (!byCategory.has(category)) byCategory.set(category, new Map());
    const resources = byCategory.get(category)!;
    if (!resources.has(resourceKey)) resources.set(resourceKey, new Map());
    resources.get(resourceKey)!.set(perm.action, perm.id);
  }

  const groups: PermissionGroup[] = [];
  for (const [category, resources] of byCategory) {
    const rows: GroupedResource[] = [];
    for (const [resourceKey, actions] of resources) {
      rows.push({
        resource: resourceKey ? `${category}.${resourceKey}` : category,
        resourceKey,
        category,
        actions,
      });
    }
    rows.sort((a, b) => {
      // แถวสิทธิ์ระดับโมดูลอยู่บนสุดเสมอ — มันคือประตูเข้าโมดูล ไม่ใช่ resource หนึ่ง
      if (a.resourceKey === MODULE_RESOURCE_KEY) return -1;
      if (b.resourceKey === MODULE_RESOURCE_KEY) return 1;
      return labelOf(a).localeCompare(labelOf(b));
    });
    groups.push({ category, resources: rows });
  }

  groups.sort((a, b) => categoryRank(a.category) - categoryRank(b.category));
  return groups;
}
