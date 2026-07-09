import type { LucideIcon } from "lucide-react";
import { PERMISSIONS, type Permission } from "@/constant/permissions";
import {
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
  Mail,
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
        icon: FileSpreadsheet,
        permission: PERMISSIONS.vendor_management.view,
      },
      {
        name: "requestPriceList",
        path: "/vendor-management/request-price-list",
        icon: FileSpreadsheet,
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
        icon: ListChecks,
      },
      {
        name: "stockReplenishment",
        path: "/store-operation/stock-replenishment",
        icon: PackagePlus,
        permission: PERMISSIONS.inventory_management.stock_in.view,
      },
      {
        name: "wastageReporting",
        path: "/store-operation/wastage-reporting",
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
        icon: ArrowUpDown,
        permission: PERMISSIONS.inventory_management.view,
      },
      {
        name: "transaction",
        path: "/inventory-management/transaction",
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
        icon: BookOpen,
        permission: PERMISSIONS.operation_plan.view,
      },
      {
        name: "operationCategory",
        path: "/operation-plan/category",
        icon: Layers,
        permission: PERMISSIONS.operation_plan.view,
      },
      {
        name: "operationCuisine",
        path: "/operation-plan/cuisine",
        icon: UtensilsCrossed,
        permission: PERMISSIONS.operation_plan.view,
      },
      {
        name: "operationEquipment",
        path: "/operation-plan/equipment",
        icon: Wrench,
        permission: PERMISSIONS.operation_plan.view,
      },
      {
        name: "operationEquipmentCategory",
        path: "/operation-plan/equipment-category",
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
        icon: Files,
        permission: PERMISSIONS.report_analytics.view,
      },
      {
        name: "reportSchedule",
        path: "/report/schedules",
        icon: Calendar,
        permission: PERMISSIONS.report_analytics.view,
      },
      {
        name: "reportHistory",
        path: "/report/history",
        icon: Clock,
        permission: PERMISSIONS.report_analytics.view,
      },
    ],
  },
  {
    name: "config",
    path: "/config",
    icon: Settings2,
    subModules: [
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
        icon: Scale,
        permission: PERMISSIONS.product_management.unit.view,
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
        icon: Clock,
        permission: PERMISSIONS.configuration.view,
      },
      {
        name: "extraCost",
        path: "/config/extra-cost",
        icon: Coins,
        permission: PERMISSIONS.configuration.extra_cost.view,
      },
      {
        name: "certification",
        path: "/config/certification",
        icon: Award,
        separatorBefore: true,
        permission: PERMISSIONS.configuration.view,
      },
      {
        name: "eco",
        path: "/config/eco",
        icon: Leaf,
        permission: PERMISSIONS.configuration.view,
      },
    ],
  },
  {
    name: "systemAdmin",
    path: "/system-admin",
    icon: Shield,
    subModules: [
      {
        name: "businessSetting",
        path: "/system-admin/business-setting",
        icon: Briefcase,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "period",
        path: "/system-admin/period",
        icon: Calendar,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "workflow",
        path: "/system-admin/workflow",
        icon: Network,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "role",
        path: "/system-admin/role",
        icon: ShieldCheck,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "user",
        path: "/system-admin/user",
        icon: UserCheck,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "runningCode",
        path: "/system-admin/running-code",
        icon: Hash,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "document",
        path: "/system-admin/document",
        icon: FileCheck,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "userActivity",
        path: "/system-admin/user-activity",
        icon: UserRoundSearch,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "activityLog",
        path: "/system-admin/activity-log",
        icon: Activity,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "configEmail",
        path: "/system-admin/config-email",
        icon: Mail,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "notificationTemplate",
        path: "/system-admin/notification-template",
        icon: BellRing,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "dashboardDataset",
        path: "/system-admin/dashboard-dataset",
        icon: Database,
        permission: PERMISSIONS.system_configuration.view,
      },
    ],
  },
];
