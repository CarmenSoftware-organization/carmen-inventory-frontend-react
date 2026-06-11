export const MODULE_COLOR_MAP: Record<string, string> = {
  "/dashboard": "var(--module-dashboard)",
  "/dashboard/pr": "var(--sub-pr)",
  "/dashboard/po": "var(--sub-po)",
  "/dashboard/grn": "var(--sub-grn)",
  "/dashboard/inventory": "var(--module-inventory)",
  "/dashboard/sr": "var(--sub-store-requisition)",

  "/procurement": "var(--module-procurement)",
  "/procurement/approval": "var(--sub-approval)",
  "/procurement/purchase-request": "var(--sub-pr)",
  "/procurement/purchase-request-template": "var(--sub-prt)",
  "/procurement/purchase-order": "var(--sub-po)",
  "/procurement/goods-receive-note": "var(--sub-grn)",
  "/procurement/credit-note": "var(--sub-cn)",

  "/product-management": "var(--module-product)",
  "/product-management/category": "var(--sub-product-category)",
  "/product-management/product": "var(--sub-product)",

  "/vendor-management": "var(--module-vendor)",
  "/vendor-management/vendor": "var(--sub-vendor)",
  "/vendor-management/price-list": "var(--sub-price-list)",
  "/vendor-management/price-list-template": "var(--sub-price-list-template)",
  "/vendor-management/request-price-list": "var(--sub-request-price-list)",

  "/store-operation": "var(--module-store)",
  "/store-operation/store-requisition": "var(--sub-store-requisition)",
  "/store-operation/stock-replenishment": "var(--sub-stock-replenishment)",
  "/store-operation/wastage-reporting": "var(--sub-wastage-reporting)",

  "/inventory-management": "var(--module-inventory)",
  "/inventory-management/inventory-adjustment": "var(--sub-inventory-adjustment)",
  "/inventory-management/transaction": "var(--sub-transaction)",
  "/inventory-management/physical-count": "var(--sub-physical-count)",
  "/inventory-management/spot-check": "var(--sub-spot-check)",
  "/inventory-management/period-end": "var(--sub-period-end)",

  "/operation-plan": "var(--module-operation)",
  "/operation-plan/recipe": "var(--sub-recipe)",
  "/operation-plan/category": "var(--sub-op-category)",
  "/operation-plan/cuisine": "var(--sub-cuisine)",
  "/operation-plan/equipment": "var(--sub-equipment)",
  "/operation-plan/equipment-category": "var(--sub-equipment-category)",

  "/report": "var(--module-report)",
  "/report/schedules": "var(--sub-report-schedule)",
  "/report/history": "var(--sub-report-history)",

  "/config": "var(--module-config)",
  "/config/location": "var(--sub-location)",
  "/config/department": "var(--sub-department)",
  "/config/delivery-point": "var(--sub-delivery-point)",
  "/config/unit": "var(--sub-unit)",
  "/config/adjustment-type": "var(--sub-adjustment-type)",
  "/config/business-type": "var(--sub-business-type)",
  "/config/credit-note-reason": "var(--sub-cn-reason)",
  "/config/currency": "var(--sub-currency)",
  "/config/exchange-rate": "var(--sub-exchange-rate)",
  "/config/tax-profile": "var(--sub-tax-profile)",
  "/config/credit-term": "var(--sub-credit-term)",
  "/config/extra-cost": "var(--sub-extra-cost)",

  "/system-admin": "var(--module-admin)",
  "/system-admin/period": "var(--sub-period)",
  "/system-admin/workflow": "var(--sub-workflow)",
  "/system-admin/role": "var(--sub-role)",
  "/system-admin/user": "var(--sub-user)",
  "/system-admin/running-code": "var(--sub-running-code)",
  "/system-admin/document": "var(--sub-document)",
};

/**
 * คืนค่า CSS color variable ของ module ที่ตรงกับ pathname โดยใช้ longest prefix match
 *
 * ถ้าไม่พบ prefix ที่ตรงกันจะ fallback เป็น `var(--primary)`
 *
 * @param pathname - path ปัจจุบัน (เช่น "/procurement/purchase-request")
 * @returns CSS variable string สำหรับใช้ใน style เช่น `var(--sub-pr)`
 * @example
 * ```ts
 * getModuleColor("/procurement/purchase-request"); // "var(--sub-pr)"
 * getModuleColor("/unknown"); // "var(--primary)"
 * ```
 */
export function getModuleColor(pathname: string): string {
  const match = Object.keys(MODULE_COLOR_MAP)
    .filter((p) => pathname === p || pathname.startsWith(p + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return match ? MODULE_COLOR_MAP[match] : "var(--primary)";
}
