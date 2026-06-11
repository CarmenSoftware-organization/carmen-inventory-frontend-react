
import Link from "@/lib/compat/link";
import { ArrowRight, FileText, ShoppingCart, ClipboardList } from "lucide-react";
import { useTranslations } from "use-intl";
import {
  useMyPendingSrCount,
  useMyPendingPrCount,
  useMyPendingPoCount,
} from "@/hooks/use-dashboard";
import { getModuleColor } from "@/constant/module-color-map";

const DOC_TYPE_HREF = {
  pr: "/procurement/purchase-request",
  po: "/procurement/purchase-order",
  sr: "/store-operation/store-requisition",
};

/**
 * Section ของ dashboard แสดงจำนวนเอกสาร pending ของผู้ใช้แบ่งตาม PR/PO/SR พร้อมลิงก์ไปหน้ารายการ
 *
 * @param - ไม่มี parameter
 * @returns JSX ของ my pending section
 * @example
 * ```tsx
 * import { DashboardMyPending } from "./_components/dashboard-my-pending";
 *
 * <DashboardMyPending />
 * ```
 */
export function DashboardMyPending() {
  const t = useTranslations("dashboard");

  const { data: srCount } = useMyPendingSrCount();
  const { data: prCount } = useMyPendingPrCount();
  const { data: poCount } = useMyPendingPoCount();

  const prColor = getModuleColor("/procurement/purchase-request");
  const poColor = getModuleColor("/procurement/purchase-order");
  const srColor = getModuleColor("/store-operation/store-requisition");

  const summary = [
    {
      label: t("purchaseRequests"),
      href: DOC_TYPE_HREF.pr,
      icon: FileText,
      pending: prCount?.pending ?? 0,
      color: prColor,
    },
    {
      label: t("purchaseOrders"),
      href: DOC_TYPE_HREF.po,
      icon: ShoppingCart,
      pending: poCount?.pending ?? 0,
      color: poColor,
    },
    {
      label: t("storeRequisitions"),
      href: DOC_TYPE_HREF.sr,
      icon: ClipboardList,
      pending: srCount?.pending ?? 0,
      color: srColor,
    },
  ];

  return (
    <section className="space-y-2">
      <h2 className="border-b pb-2 text-sm font-semibold">{t("myPending")}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summary.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group bg-card hover:bg-accent flex items-start gap-3 rounded-md border p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            style={{ borderLeftColor: item.color, borderLeftWidth: "3px" }}
          >
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-md"
              style={{
                backgroundColor: `color-mix(in oklch, ${item.color} 15%, transparent)`,
              }}
            >
              <item.icon className="size-4" style={{ color: item.color }} />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-muted-foreground truncate text-sm">
                {item.label}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold tabular-nums">
                  {item.pending}
                </span>
                <span className="text-muted-foreground text-xs">
                  {t("pending")}
                </span>
              </div>
            </div>
            <ArrowRight className="text-muted-foreground size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </section>
  );
}
