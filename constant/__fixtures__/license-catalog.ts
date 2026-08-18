/**
 * สำเนา feature key ทั้งหมดของ license catalog ฝั่ง backend — **ใช้ในเทสต์เท่านั้น**
 *
 * ## ที่มา
 * คัดลอกจาก `LICENSE_FEATURES` ใน repo `carmen-turborepo-backend-v2`
 * ที่ `apps/backend-gateway/src/license/license-catalog.generated.ts`
 * (branch `feature/license-model`) ซึ่งเป็นไฟล์ generated จาก
 * `prisma/permission.route-map.ts` + `prisma/seed.permission.data.ts`
 *
 * ## ทำไมต้องมีสำเนาในรีโปนี้
 * FE คำนวณ feature key ของแต่ละหน้าเองจาก `constant/module-list.ts`
 * (`licenseFeature` หรือ `featureKeyOf(permission)`) แต่ **namespace ของ permission
 * กับของ license feature ไม่ใช่ตัวเดียวกัน** — key ที่คำนวณผิดจะทำให้หน้านั้น
 * ถูกล็อกถาวรตอนเปิด `LICENSE_ENFORCEMENT` และ license **ไม่มี admin bypass**
 * จึงไม่มีใครในระบบเข้าไปแก้ได้เลย
 * `constant/module-list.license-feature.test.ts` ใช้ไฟล์นี้ยืนยันว่าทุก leaf
 * ผลิต key ที่มีอยู่จริงใน catalog
 *
 * ## วิธีอัปเดตเมื่อ backend เพิ่ม/แก้ feature
 * 1. เปิดไฟล์ generated ของ backend ตามพาธด้านบน
 * 2. คัดลอกค่า `key` ทุกตัวใน `LICENSE_FEATURES` มาแทนอาร์เรย์ด้านล่าง
 *    (module = entry ที่ `parent_key: null`)
 * 3. รัน `bun test:run constant/module-list.license-feature.test.ts`
 *
 * ห้ามแก้ไฟล์นี้เพื่อ "ทำให้เทสต์ผ่าน" — ถ้าเทสต์แดง แปลว่า `module-list.ts`
 * ชี้ไป feature ที่ backend ไม่รู้จัก ต้องแก้ที่ `module-list.ts`
 *
 * สแนปช็อต ณ 2026-08-19: 74 feature (10 module + 64 resource)
 */

/** feature key ทั้งหมดใน catalog (module + resource) */
export const LICENSE_FEATURE_KEYS: readonly string[] = [
  "configuration",
  "configuration.adjustment_type",
  "configuration.app_config",
  "configuration.business_type",
  "configuration.credit_note_reason",
  "configuration.credit_term",
  "configuration.currency",
  "configuration.delivery_point",
  "configuration.department",
  "configuration.dimension",
  "configuration.exchange_rate",
  "configuration.extra_cost_type",
  "configuration.location",
  "configuration.notification_template",
  "configuration.tax_profile",
  "configuration.unit",
  "dashboard",
  "dashboard.dataset",
  "dashboard.widget",
  "inventory_management",
  "inventory_management.cost",
  "inventory_management.inventory_adjustment",
  "inventory_management.period_end",
  "inventory_management.physical_count",
  "inventory_management.physical_count_period",
  "inventory_management.spot_check",
  "inventory_management.stock_in",
  "inventory_management.stock_out",
  "inventory_management.transaction",
  "operation_plan",
  "operation_plan.category",
  "operation_plan.cuisine",
  "operation_plan.equipment",
  "operation_plan.equipment_category",
  "operation_plan.recipe",
  "procurement",
  "procurement.credit_note",
  "procurement.extra_cost",
  "procurement.goods_received_note",
  "procurement.purchase_order",
  "procurement.purchase_request",
  "procurement.purchase_request_template",
  "product_management",
  "product_management.category",
  "product_management.eco_label",
  "product_management.item_group",
  "product_management.master_eco_label",
  "product_management.product",
  "product_management.sub_category",
  "report",
  "report.history",
  "report.list",
  "report.schedule",
  "store_operations",
  "store_operations.stock_replenishment",
  "store_operations.store_requisition",
  "store_operations.wastage_reporting",
  "system_admin",
  "system_admin.activity_log",
  "system_admin.document",
  "system_admin.period",
  "system_admin.query_dataset",
  "system_admin.role",
  "system_admin.running_code",
  "system_admin.user",
  "system_admin.workflow",
  "vendor_management",
  "vendor_management.price_list",
  "vendor_management.price_list_template",
  "vendor_management.request_price_list",
  "vendor_management.vendor",
  "vendor_management.vendor_certificate",
  "vendor_management.vendor_master_certificate",
  "vendor_management.vendor_product",
];

/** เฉพาะ module-level key (entry ที่ `parent_key: null` ใน catalog) */
export const LICENSE_MODULE_KEYS: readonly string[] = [
  "configuration",
  "dashboard",
  "inventory_management",
  "operation_plan",
  "procurement",
  "product_management",
  "report",
  "store_operations",
  "system_admin",
  "vendor_management",
];
