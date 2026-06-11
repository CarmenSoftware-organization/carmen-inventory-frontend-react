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

/** Helper: สร้าง CRUD set จาก prefix — view/create/update/delete */
function crud<P extends string>(prefix: P) {
  return {
    view: `${prefix}.view`,
    create: `${prefix}.create`,
    update: `${prefix}.update`,
    delete: `${prefix}.delete`,
  } as const;
}

/** Helper: สร้าง view-only resource */
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
  widget: {
    view: "widget.view",
    create: "widget.create",
    update: "widget.update",
    delete: "widget.delete",
    dashboard: {
      manage_bu: "widget.dashboard.manage_bu",
    },
  },
  system_configuration: {
    view: "system_configuration.view",
    update: "system_configuration.update",
  },
  report_analytics: {
    view: "report_analytics.view",
  },
  /**
   * Frontend-only placeholder — BE catalog ยังไม่มี operation_plan namespace
   * ใช้ gate menu/route ของ /operation-plan/* ให้ non-admin denied ทั้งกลุ่ม
   * พอ BE เพิ่ม perm นี้ → ปรับให้ตรงและลบ comment นี้
   */
  operation_plan: {
    view: "operation_plan.view",
  },
} as const;

/** Recursive helper — pull ทุก string value ใน nested object */
type Leaves<T> = T extends string
  ? T
  : T extends object
    ? { [K in keyof T]: Leaves<T[K]> }[keyof T]
    : never;

/** Union ของทุก permission key ที่มีใน catalog */
export type Permission = Leaves<typeof PERMISSIONS>;

/** Action เพิ่ม-แก้-ลบ-ดู ที่ใช้บ่อยใน CRUD prefix */
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
