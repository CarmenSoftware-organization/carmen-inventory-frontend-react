import type { LucideIcon } from "lucide-react";
import { PERMISSIONS, type Permission } from "@/constant/permissions";
import {
  Link2,
  BookText,
  LayoutDashboard,
  Settings2,
  Coins,
  Building,
  ShoppingCart,
  FileText,
  ClipboardList,
  PackageCheck,
  Package,
  Box,
  Tag,
  FileCheck,
  FileInput,
  FileSpreadsheet,
  DollarSign,
  ArrowLeftRight,
  MapPin,
  Warehouse,
  Receipt,
  Rows3,
  Briefcase,
  Scale,
  SlidersHorizontal,
  Handshake,
  Building2,
  BadgeDollarSign,
  Store,
  ListChecks,
  PackagePlus,
  AlertTriangle,
  ArrowUpDown,
  Eye,
  ClipboardCheck,
  Calendar,
  Shield,
  Network,
  Cable,
  ShieldCheck,
  UserCheck,
  ChefHat,
  UtensilsCrossed,
  Layers,
  BookOpen,
  Wrench,
  FolderTree,
  Files,
  Hash,
  Clock,
  MessageSquareText,
  Activity,
  UserRoundSearch,
  BellRing,
  Database,
  Award,
  Leaf,
} from "lucide-react";

export interface ModuleDto {
  name: string;
  path: string;
  icon: LucideIcon;
  subModules?: ModuleDto[];
  /** When true, render a visual separator before this module */
  separatorBefore?: boolean;
  /**
   * Permission code required to see this module
   * ใช้ reference จาก `PERMISSIONS` แทน string literal (เพื่อ type safety)
   * Undefined = visible to everyone (parent groups, dashboard, etc.)
   * Admin bypasses regardless
   */
  permission?: Permission;
  /**
   * License feature key ของ leaf นี้ — ระบุตรง ๆ เมื่อ key ที่คำนวณจาก `permission`
   * ไม่ตรงกับ catalog ของ backend
   *
   * **ทำไมต้องมีฟิลด์นี้:** namespace ของ *permission* (RBAC) กับของ *license feature*
   * **ไม่ใช่ตัวเดียวกัน** เช่น หน้า Unit ใช้ permission `product_management.unit.view`
   * แต่ backend คิดค่า license เป็น `configuration.unit`; หน้า Report ใช้
   * `report_analytics.view` แต่ feature จริงคือ `report.list` การปล่อยให้คำนวณเอง
   * จะได้ key ที่ไม่มีอยู่ใน catalog → หน้านั้นถูกล็อกถาวรตอนเปิด
   * `LICENSE_ENFORCEMENT` และ license **ไม่มี admin bypass** จึงไม่มีใครเข้าไปแก้ได้
   *
   * ค่าที่ใส่ต้องมาจาก `LICENSE_ROUTE_FEATURES` ของ backend (map จาก URL path จริง
   * ของ endpoint ที่หน้านั้นเรียก) ไม่ใช่การเดาจากชื่อเมนู
   *
   * ลำดับการหาค่า: `licenseFeature` → `featureKeyOf(permission)` → ไม่มีเลย = ไม่ล็อก
   * (`licenseFeatureOf()` ใน `hooks/use-license.ts`)
   *
   * เพิ่ม leaf ใหม่แล้วเทสต์ `constant/module-list.license-feature.test.ts` แดง
   * แปลว่า key ที่ได้ไม่มีใน catalog — แก้ที่นี่ ห้ามแก้ fixture
   */
  licenseFeature?: string;
}

export function getModule(path: string): ModuleDto {
  const mod = moduleList.find((m) => m.path === path);
  if (!mod) throw new Error(`Module not found: ${path}`);
  return mod;
}

/**
 * หา leaf ที่ตรงกับ pathname (รวมเส้นทาง nested เช่น /[id], /new)
 *
 * เลือก path ที่ specific สุด (ยาวสุด) — เช่น `/procurement/purchase-request/123`
 * จะ match leaf `/procurement/purchase-request` ไม่ใช่ parent `/procurement`
 *
 * ใช้ใน RouteGuard เพื่อหา permission code ของหน้าปัจจุบัน
 */
export function findRouteLeaf(pathname: string): ModuleDto | undefined {
  let best: ModuleDto | undefined;
  const walk = (mods: ModuleDto[]) => {
    for (const m of mods) {
      if (pathname === m.path || pathname.startsWith(m.path + "/")) {
        if (!best || m.path.length > best.path.length) best = m;
      }
      if (m.subModules) walk(m.subModules);
    }
  };
  walk(moduleList);
  return best;
}

export const moduleList: ModuleDto[] = [
  {
    name: "dashboard",
    path: "/dashboard",
    licenseFeature: "dashboard.widget", // app:dashboard-widgets (/api/me/dashboard-widgets)
    icon: LayoutDashboard,
  },
  {
    name: "procurement",
    path: "/procurement",
    icon: ShoppingCart,
    subModules: [
      {
        name: "myApproval",
        path: "/procurement/approval",
        icon: FileCheck,
      },
      {
        name: "purchaseRequest",
        path: "/procurement/purchase-request",
        licenseFeature: "procurement.purchase_request", // app:purchase-requests
        icon: FileText,
      },
      {
        name: "purchaseRequestTemplate",
        path: "/procurement/purchase-request-template",
        icon: FileSpreadsheet,
        permission: PERMISSIONS.procurement.purchase_request_template.view,
      },
      {
        name: "purchaseOrder",
        path: "/procurement/purchase-order",
        licenseFeature: "procurement.purchase_order", // app:purchase-orders
        icon: ClipboardList,
        separatorBefore: false,
      },
      {
        name: "goodsReceiveNote",
        path: "/procurement/goods-receive-note",
        icon: PackageCheck,
        separatorBefore: false,
        permission: PERMISSIONS.procurement.goods_received_note.view,
      },
      {
        name: "creditNote",
        path: "/procurement/credit-note",
        icon: FileInput,
        permission: PERMISSIONS.procurement.credit_note.view,
      },
    ],
  },
  {
    name: "productManagement",
    path: "/product-management",
    icon: Package,
    subModules: [
      {
        name: "productCategory",
        path: "/product-management/category",
        icon: Tag,
        permission: PERMISSIONS.product_management.category.view,
      },
      {
        name: "product",
        path: "/product-management/product",
        icon: Box,
        permission: PERMISSIONS.product_management.product.view,
      },
      {
        // licenseFeature ชี้ product_management มาตั้งแต่แรก — ย้ายมาให้ตรงกัน
        // permission ย้ายตามด้วย (เดิม configuration.view)
        name: "eco",
        path: "/product-management/eco",
        licenseFeature: "product_management.master_eco_label", // config:product-master-eco-labels
        icon: Leaf,
        separatorBefore: true,
        permission: PERMISSIONS.product_management.view,
      },
    ],
  },
  {
    name: "vendorManagement",
    path: "/vendor-management",
    icon: Handshake,
    subModules: [
      {
        name: "vendor",
        path: "/vendor-management/vendor",
        icon: Building2,
        permission: PERMISSIONS.vendor_management.vendor.view,
      },
      {
        name: "priceList",
        path: "/vendor-management/price-list",
        icon: BadgeDollarSign,
        separatorBefore: false,
        permission: PERMISSIONS.vendor_management.price_list.view,
      },
      {
        name: "priceListTemplate",
        path: "/vendor-management/price-list-template",
        licenseFeature: "vendor_management.price_list_template", // app:pricelist-templates
        icon: FileSpreadsheet,
        permission: PERMISSIONS.vendor_management.view,
      },
      {
        name: "requestPriceList",
        path: "/vendor-management/request-price-list",
        licenseFeature: "vendor_management.request_price_list", // app:request-for-pricings
        icon: FileSpreadsheet,
        permission: PERMISSIONS.vendor_management.view,
      },
      {
        // licenseFeature ชี้ vendor_management มาตั้งแต่แรก — ย้ายมาอยู่ใต้เมนูนี้
        // ให้ตรงกับที่ backend จัดหมวดไว้ · permission ย้ายตามด้วย (เดิม
        // configuration.view) คนที่มีสิทธิ์ config แต่ไม่มี vendor_management
        // จะไม่เห็นเมนูนี้อีก — เป็นผลที่ตั้งใจ ไม่ใช่ผลข้างเคียง
        name: "certification",
        path: "/vendor-management/certification",
        licenseFeature: "vendor_management.vendor_master_certificate", // config:vendor-master-certificates
        icon: Award,
        separatorBefore: true,
        permission: PERMISSIONS.vendor_management.view,
      },
    ],
  },
  {
    name: "storeOperations",
    path: "/store-operation",
    icon: Store,
    subModules: [
      {
        name: "storeRequisition",
        path: "/store-operation/store-requisition",
        licenseFeature: "store_operations.store_requisition", // app:store-requisitions
        icon: ListChecks,
      },
      {
        name: "stockReplenishment",
        path: "/store-operation/stock-replenishment",
        licenseFeature: "store_operations.stock_replenishment", // app:stock-replenishment
        icon: PackagePlus,
        permission: PERMISSIONS.inventory_management.stock_in.view,
      },
      {
        name: "wastageReporting",
        path: "/store-operation/wastage-reporting",
        licenseFeature: "store_operations.wastage_reporting", // app:wastage-reporting
        icon: AlertTriangle,
        permission: PERMISSIONS.inventory_management.stock_out.view,
      },
    ],
  },
  {
    name: "inventoryManagement",
    path: "/inventory-management",
    icon: Warehouse,
    subModules: [
      {
        name: "inventoryAdjustment",
        path: "/inventory-management/inventory-adjustment",
        licenseFeature: "inventory_management.inventory_adjustment", // app:inventory-adjustments
        icon: ArrowUpDown,
        permission: PERMISSIONS.inventory_management.view,
      },
      {
        name: "transaction",
        path: "/inventory-management/transaction",
        licenseFeature: "inventory_management.transaction", // app:inventory-transactions
        icon: Receipt,
        permission: PERMISSIONS.inventory_management.view,
      },
      {
        name: "physicalCount",
        path: "/inventory-management/physical-count",
        icon: ClipboardCheck,
        permission: PERMISSIONS.inventory_management.physical_count.view,
      },
      {
        name: "spotCheck",
        path: "/inventory-management/spot-check",
        icon: Eye,
        permission: PERMISSIONS.inventory_management.spot_check.view,
      },
      {
        name: "periodEnd",
        path: "/inventory-management/period-end",
        icon: Calendar,
        separatorBefore: true,
        permission: PERMISSIONS.inventory_management.period_end.view,
      },
    ],
  },
  {
    name: "operationPlan",
    path: "/operation-plan",
    icon: ChefHat,
    subModules: [
      {
        name: "operationRecipe",
        path: "/operation-plan/recipe",
        licenseFeature: "operation_plan.recipe", // config:recipes
        icon: BookOpen,
        permission: PERMISSIONS.operation_plan.view,
      },
      {
        name: "operationCategory",
        path: "/operation-plan/category",
        licenseFeature: "operation_plan.category", // config:recipe-categories
        icon: Layers,
        permission: PERMISSIONS.operation_plan.view,
      },
      {
        name: "operationCuisine",
        path: "/operation-plan/cuisine",
        licenseFeature: "operation_plan.cuisine", // config:recipe-cuisines
        icon: UtensilsCrossed,
        permission: PERMISSIONS.operation_plan.view,
      },
      {
        name: "operationEquipment",
        path: "/operation-plan/equipment",
        licenseFeature: "operation_plan.equipment", // config:recipe-equipment
        icon: Wrench,
        permission: PERMISSIONS.operation_plan.view,
      },
      {
        name: "operationEquipmentCategory",
        path: "/operation-plan/equipment-category",
        licenseFeature: "operation_plan.equipment_category", // config:recipe-equipment-categories
        icon: FolderTree,
        permission: PERMISSIONS.operation_plan.view,
      },
    ],
  },
  {
    name: "report",
    path: "/report",
    icon: Files,
    subModules: [
      {
        name: "reportList",
        path: "/report/list",
        licenseFeature: "report.list", // app:reports
        icon: Files,
        permission: PERMISSIONS.report_analytics.view,
      },
      {
        name: "reportSchedule",
        path: "/report/schedules",
        licenseFeature: "report.list", // app:reports (/api/{bu}/reports/schedules -> segment 'reports')
        icon: Calendar,
        permission: PERMISSIONS.report_analytics.view,
      },
      {
        name: "reportHistory",
        path: "/report/history",
        licenseFeature: "report.list", // app:reports (/api/{bu}/reports/history -> segment 'reports')
        icon: Clock,
        permission: PERMISSIONS.report_analytics.view,
      },
    ],
  },
  {
    name: "accounting",
    path: "/accounting",
    icon: BookOpen,
    subModules: [
      {
        name: "journalVoucher",
        path: "/accounting/journal-voucher",
        icon: FileText,
      },
      {
        name: "templateVoucher",
        path: "/accounting/template-voucher",
        icon: FileSpreadsheet,
      },
      {
        name: "recurringVoucher",
        path: "/accounting/recurring-voucher",
        icon: Clock,
      },
      {
        name: "allocationVoucher",
        path: "/accounting/allocation-voucher",
        icon: ArrowLeftRight,
      },
      {
        name: "accountsPayable",
        path: "/accounting/accounts-payable",
        icon: BadgeDollarSign,
        separatorBefore: true,
        subModules: [
          {
            name: "apInvoice",
            path: "/accounting/accounts-payable/invoice",
            icon: FileInput,
          },
          {
            name: "apPayment",
            path: "/accounting/accounts-payable/payment",
            icon: DollarSign,
          },
        ],
      },
      {
        name: "accountsReceivable",
        path: "/accounting/accounts-receivable",
        icon: Receipt,
        subModules: [
          {
            name: "arInvoice",
            path: "/accounting/accounts-receivable/invoice",
            icon: FileText,
          },
          {
            name: "arReceipt",
            path: "/accounting/accounts-receivable/receipt",
            icon: BadgeDollarSign,
          },
        ],
      },
      {
        name: "financialReports",
        path: "/accounting/financial-reports",
        icon: Files,
        separatorBefore: true,
      },
    ],
  },
  {
    name: "config",
    path: "/config",
    icon: Settings2,
    subModules: [
      {
        // ยังไม่ผูก permission/licenseFeature โดยตั้งใจ — โมดูลนี้เพิ่งวางโครง
        // ไว้ก่อน RouteGuard ปล่อยผ่าน leaf ที่ไม่ประกาศ permission อยู่แล้ว
        // (ดู components/route-guard.tsx) พอ backend มี endpoint จริงและ
        // catalog มีคีย์ของมันแล้วค่อยเติมทั้งสองอย่างพร้อมกัน
        name: "chartOfAccount",
        path: "/config/chart-of-account",
        icon: BookText,
      },
      {
        // ยังไม่ผูก permission/licenseFeature ด้วยเหตุผลเดียวกับ chartOfAccount
        name: "accountMapping",
        path: "/config/account-mapping",
        icon: Link2,
      },
      {
        name: "storeLocation",
        path: "/config/location",
        icon: Building,
        permission: PERMISSIONS.configuration.location.view,
      },
      {
        name: "department",
        path: "/config/department",
        icon: Warehouse,
        permission: PERMISSIONS.configuration.department.view,
      },
      {
        name: "deliveryPoint",
        path: "/config/delivery-point",
        icon: MapPin,
        permission: PERMISSIONS.configuration.delivery_point.view,
      },
      {
        name: "unit",
        path: "/config/unit",
        licenseFeature: "configuration.unit", // config:units
        icon: Scale,
        permission: PERMISSIONS.product_management.unit.view,
      },
      {
        name: "shelf",
        path: "/config/shelf",
        licenseFeature: "configuration",
        icon: Rows3,
        permission: PERMISSIONS.configuration.shelf.view,
      },
      {
        name: "adjustmentType",
        path: "/config/adjustment-type",
        icon: SlidersHorizontal,
        permission: PERMISSIONS.configuration.adjustment_type.view,
      },
      {
        name: "businessType",
        path: "/config/business-type",
        icon: Briefcase,
        permission: PERMISSIONS.configuration.business_type.view,
      },
      {
        name: "creditNoteReason",
        path: "/config/credit-note-reason",
        licenseFeature: "configuration.credit_note_reason", // app:credit-note-reasons
        icon: MessageSquareText,
        permission: PERMISSIONS.configuration.view,
      },
      {
        name: "currency",
        path: "/config/currency",
        icon: DollarSign,
        separatorBefore: true,
        permission: PERMISSIONS.configuration.currency.view,
      },
      {
        name: "exchangeRate",
        path: "/config/exchange-rate",
        icon: ArrowLeftRight,
        permission: PERMISSIONS.configuration.exchange_rate.view,
      },
      {
        name: "taxProfile",
        path: "/config/tax-profile",
        icon: Receipt,
        permission: PERMISSIONS.configuration.tax_profile.view,
      },
      {
        name: "creditTerm",
        path: "/config/credit-term",
        licenseFeature: "configuration.credit_term", // config:credit-terms
        icon: Clock,
        permission: PERMISSIONS.configuration.view,
      },
      {
        name: "extraCost",
        path: "/config/extra-cost",
        licenseFeature: "configuration.extra_cost_type", // config:extra-cost-types
        icon: Coins,
        permission: PERMISSIONS.configuration.extra_cost.view,
      },
    ],
  },
  {
    name: "systemAdmin",
    path: "/system-admin",
    icon: Shield,
    subModules: [
      {
        name: "companyProfile",
        path: "/system-admin/company-profile",
        // `/api/business-units` ไม่แมตช์ LICENSE_ROUTE_FEATURES เลย (backend fail-open)
        // จึงไม่มี resource key ที่ "ถูก" ให้ใช้ — ใช้ module key ของกลุ่มที่หน้านี้อยู่
        // ซึ่งล็อกเฉพาะ BU ที่ไม่ได้ซื้อ System Admin ทั้งโมดูล (over-lock น้อยที่สุด)
        licenseFeature: "system_admin",
        icon: Briefcase,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "defaultSetting",
        path: "/system-admin/default-setting",
        // เหมือน companyProfile — ยิง `/api/business-units` + `/api-system/...`
        // ซึ่งอยู่นอกขอบเขต license ทั้งคู่
        licenseFeature: "system_admin",
        icon: SlidersHorizontal,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "period",
        path: "/system-admin/period",
        licenseFeature: "system_admin.period", // app:periods
        icon: Calendar,
        separatorBefore: true,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "workflow",
        path: "/system-admin/workflow",
        licenseFeature: "system_admin.workflow", // config:workflows
        icon: Network,
        permission: PERMISSIONS.system_configuration.view,
        // เมนูย่อยเป็น route จริงของตัวเอง เพราะแต่ละชนิดยิงคนละ endpoint
        // (`GET /config/{bu}/workflows/{slug}`) ไม่ใช่กรองจากชุดเดียวกัน
        subModules: [
          {
            name: "workflowPurchaseRequest",
            path: "/system-admin/workflow/purchase-request",
            licenseFeature: "system_admin.workflow",
            icon: ShoppingCart,
            permission: PERMISSIONS.system_configuration.view,
          },
          {
            name: "workflowPurchaseOrder",
            path: "/system-admin/workflow/purchase-order",
            licenseFeature: "system_admin.workflow",
            icon: Receipt,
            permission: PERMISSIONS.system_configuration.view,
          },
          {
            name: "workflowStoreRequisition",
            path: "/system-admin/workflow/store-requisition",
            licenseFeature: "system_admin.workflow",
            icon: Store,
            permission: PERMISSIONS.system_configuration.view,
          },
        ],
      },
      {
        name: "interface",
        path: "/system-admin/interface",
        licenseFeature: "configuration.app_config", // config:app-config
        icon: Cable,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "role",
        path: "/system-admin/role",
        licenseFeature: "system_admin.role", // config:application-roles
        icon: ShieldCheck,
        separatorBefore: true,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "user",
        path: "/system-admin/user",
        licenseFeature: "system_admin.user", // app:users
        icon: UserCheck,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "runningCode",
        path: "/system-admin/running-code",
        licenseFeature: "system_admin.running_code", // config:running-codes
        icon: Hash,
        separatorBefore: true,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "document",
        path: "/system-admin/document",
        licenseFeature: "system_admin.document", // app:documents
        icon: FileCheck,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "userActivity",
        path: "/system-admin/user-activity",
        licenseFeature: "system_admin.activity_log", // app:activity-logs
        icon: UserRoundSearch,
        separatorBefore: true,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "activityLog",
        path: "/system-admin/activity-log",
        licenseFeature: "system_admin.activity_log", // app:activity-logs
        icon: Activity,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "notificationTemplate",
        path: "/system-admin/notification-template",
        licenseFeature: "configuration.notification_template", // config:notification-templates
        icon: BellRing,
        separatorBefore: true,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "dashboardDataset",
        path: "/system-admin/dashboard-dataset",
        licenseFeature: "dashboard.dataset", // app:dashboard-lab / app:datasets
        icon: Database,
        permission: PERMISSIONS.system_configuration.view,
      },
    ],
  },
];
