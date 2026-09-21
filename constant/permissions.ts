/**
 * Permission keys catalog — mirror ของ BE `/permissions` endpoint
 *
 * Pattern: `{namespace}.{resource}.{action}` หรือ `{namespace}.{action}` (top-level)
 *
 * ใช้งาน:
 * - แทน string literal เพื่อให้ IDE autocomplete + จับ typo
 * - `useCan().can(PERMISSIONS.configuration.department.view)`
 * - `<ModuleDto>.permission` ใน module-list ใช้ reference จาก PERMISSIONS
 * - Dynamic build ใช้ `buildPermissionKey(prefix, action)` (cast เป็น Permission ภายใน)
 *
 * พบ permission ใหม่ใน BE catalog → เพิ่มที่ไฟล์นี้
 */

function crud<P extends string>(prefix: P) {
  return {
    view: `${prefix}.view`,
    create: `${prefix}.create`,
    update: `${prefix}.update`,
    delete: `${prefix}.delete`,
  } as const;
}

function viewOnly<P extends string>(prefix: P) {
  return { view: `${prefix}.view` } as const;
}

export const PERMISSIONS = {
  configuration: {
    view: "configuration.view",
    adjustment_type: crud("configuration.adjustment_type"),
    business_type: crud("configuration.business_type"),
    currency: crud("configuration.currency"),
    delivery_point: crud("configuration.delivery_point"),
    department: crud("configuration.department"),
    exchange_rate: crud("configuration.exchange_rate"),
    extra_cost: crud("configuration.extra_cost"),
    location: crud("configuration.location"),
    // shelf: backend ยังไม่มี permission key นี้ — หน้าสร้างรอไว้ non-admin
    // จะยังไม่เห็นเมนูจนกว่า backend จะ seed permission ตามชื่อนี้
    shelf: crud("configuration.shelf"),
    notification_template: crud("configuration.notification_template"),
    tax_profile: crud("configuration.tax_profile"),
  },
  product_management: {
    view: "product_management.view",
    unit: crud("product_management.unit"),
    product: crud("product_management.product"),
    category: crud("product_management.category"),
    report: viewOnly("product_management.report"),
  },
  vendor_management: {
    view: "vendor_management.view",
    vendor: crud("vendor_management.vendor"),
    price_list: crud("vendor_management.price_list"),
    price_comparison: viewOnly("vendor_management.price_comparison"),
  },
  procurement: {
    view: "procurement.view",
    purchase_request: {
      view: "procurement.purchase_request.view",
      view_department: "procurement.purchase_request.view_department",
      view_all: "procurement.purchase_request.view_all",
    },
    purchase_request_template: crud("procurement.purchase_request_template"),
    purchase_order: viewOnly("procurement.purchase_order"),
    goods_received_note: {
      view: "procurement.goods_received_note.view",
      create: "procurement.goods_received_note.create",
      update: "procurement.goods_received_note.update",
      delete: "procurement.goods_received_note.delete",
      commit: "procurement.goods_received_note.commit",
    },
    credit_note: crud("procurement.credit_note"),
  },
  inventory_management: {
    view: "inventory_management.view",
    stock_in: crud("inventory_management.stock_in"),
    stock_out: crud("inventory_management.stock_out"),
    store_requisition: {
      view: "inventory_management.store_requisition.view",
      view_department: "inventory_management.store_requisition.view_department",
      view_all: "inventory_management.store_requisition.view_all",
    },
    store_requisition_template: crud(
      "inventory_management.store_requisition_template",
    ),
    physical_count: crud("inventory_management.physical_count"),
    spot_check: crud("inventory_management.spot_check"),
    period_end: {
      view: "inventory_management.period_end.view",
      execute: "inventory_management.period_end.execute",
    },
  },
  store_operations: {
    view: "store_operations.view",
    store_requisition: {
      view: "store_operations.store_requisition.view",
      view_department: "store_operations.store_requisition.view_department",
      view_all: "store_operations.store_requisition.view_all",
    },
  },
  /**
   * System Admin — คีย์ทุกตัวในบล็อกนี้ยืนยันแล้วว่ามีแถวจริงใน
   * `CARMEN_SYSTEM.tb_permission` ของ backend (ตรวจ 2026-09-21)
   *
   * ก่อนหน้านี้ทุกหน้าใต้ `/system-admin` ใช้ `system_configuration.view` ร่วมกัน
   * ตัวเดียว ซึ่ง **ไม่มีอยู่ใน permission catalog ของ backend เลย** (0 แถวจาก 301)
   * ผลคือ non-admin ถูก `denied` ทุกหน้าโดยไม่มีทางแก้ที่หน้า Role และ admin ไม่เห็น
   * ปัญหาเพราะ `useCan()` bypass ให้อยู่แล้ว — อย่าเพิ่มคีย์ที่ไม่ได้มาจาก
   * `seed.permission.data.ts` กลับเข้ามาอีก
   *
   * `business_unit` / `config_email` / `user_activity` ถูกทำเครื่องหมาย
   * `PLANNED_RESOURCES` ฝั่ง backend (ยังไม่มี endpoint รองรับ) แต่ seed เข้า DB แล้วจริง
   * จึงติ๊กที่หน้า Role ได้ตามปกติ — เครื่องหมายนั้นไม่ได้กันการ seed
   */
  system_admin: {
    view: "system_admin.view",
    /** Company Profile + Default Setting — ทั้งคู่ยิง `/api/business-units` */
    business_unit: {
      view: "system_admin.business_unit.view",
      update: "system_admin.business_unit.update",
    },
    inventory_period: crud("system_admin.inventory_period"),
    workflow: {
      ...crud("system_admin.workflow"),
      purchase_request: viewOnly("system_admin.workflow.purchase_request"),
      purchase_order: viewOnly("system_admin.workflow.purchase_order"),
      store_requisition: viewOnly("system_admin.workflow.store_requisition"),
    },
    /** Email Profile + Email Template — ตั้งค่าอีเมลย้ายไปอยู่ใต้ `config/app-config` */
    config_email: {
      view: "system_admin.config_email.view",
      update: "system_admin.config_email.update",
    },
    role: crud("system_admin.role"),
    user: crud("system_admin.user"),
    running_code: crud("system_admin.running_code"),
    document: crud("system_admin.document"),
    user_activity: viewOnly("system_admin.user_activity"),
    activity_log: {
      view: "system_admin.activity_log.view",
      delete: "system_admin.activity_log.delete",
    },
  },
  /**
   * Dashboard — เดิมไฟล์นี้สะกด namespace นี้ว่า `widget.*` ซึ่งไม่มีอยู่ใน catalog
   * ของ backend เลย (0 แถวใน `tb_permission`) backend เรียกว่า `dashboard.widget`
   * ส่วน `widget.dashboard.manage_bu` ไม่มีที่มาทั้งใน tenant และ platform seed
   * จึงถูกลบทิ้ง ไม่ใช่ย้าย
   *
   * ไม่มี call site ไหนเคยเรียกคีย์ชุดเก่า จึงไม่มีพฤติกรรมไหนเปลี่ยน — leaf
   * `/dashboard` คุมด้วย license `dashboard.widget` อย่างเดียวเหมือนเดิม
   */
  dashboard: {
    view: "dashboard.view",
    widget: crud("dashboard.widget"),
    /** resource ของ `app:datasets` / `app:dashboard-lab` ใน route map */
    dataset: {
      view: "dashboard.dataset.view",
      create: "dashboard.dataset.create",
    },
  },
  report_analytics: {
    view: "report_analytics.view",
  },
  operation_plan: {
    view: "operation_plan.view",
  },
} as const;

type Leaves<T> = T extends string
  ? T
  : T extends object
    ? { [K in keyof T]: Leaves<T[K]> }[keyof T]
    : never;

export type Permission = Leaves<typeof PERMISSIONS>;

export type PermissionAction = "view" | "create" | "update" | "delete";

/**
 * สร้าง permission key จาก prefix แบบ dynamic (เช่นใน ConfigListTemplate
 * ที่รับ permissionPrefix prop)
 *
 * Cast เป็น `Permission` ภายในเพื่อให้ caller ไม่ต้อง cast เอง
 * (ความถูกต้องของ key ขึ้นกับ caller ส่ง prefix ที่ตรงกับ BE)
 *
 * @example
 * buildPermissionKey("configuration.department", "create")
 * // → "configuration.department.create" (typed as Permission)
 */
export function buildPermissionKey(
  prefix: string,
  action: PermissionAction,
): Permission {
  return `${prefix}.${action}` as Permission;
}
