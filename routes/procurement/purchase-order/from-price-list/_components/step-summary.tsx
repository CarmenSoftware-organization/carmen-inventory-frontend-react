
import type { ReactNode } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  Building2,
  CalendarDays,
  Coins,
  Package,
  Pencil,
  ShoppingBag,
  Truck,
  User,
  Workflow as WorkflowIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "@/hooks/use-location";
import { useWorkflowById } from "@/hooks/use-workflow";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { round2 } from "@/lib/currency-utils";
import type {
  FromPriceListFormValues,
  FromPriceListSelectedItem,
} from "../from-price-list-form-schema";

type SummaryStep = 1 | 2 | 3;

interface StepSummaryProps {
  readonly form: UseFormReturn<FromPriceListFormValues>;
  readonly onEditStep: (step: SummaryStep) => void;
}

interface SectionProps {
  readonly icon: ReactNode;
  readonly title: string;
  readonly editLabel: string;
  readonly onEdit: () => void;
  readonly children: ReactNode;
}

function Section({ icon, title, editLabel, onEdit, children }: SectionProps) {
  return (
    <section className="border-border/60 bg-card overflow-hidden rounded-lg border shadow-sm">
      <header className="bg-muted/30 flex items-center justify-between border-b px-4 py-2.5">
        <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <span className="text-muted-foreground" aria-hidden="true">
            {icon}
          </span>
          {title}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={onEdit}
          aria-label={editLabel}
        >
          <Pencil className="size-3" aria-hidden="true" />
          {editLabel}
        </Button>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function DataRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-baseline gap-2 py-1 text-sm">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}

export function StepSummary({ form, onEditStep }: StepSummaryProps) {
  const t = useTranslations("procurement.purchaseOrder");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const { dateFormat, defaultBu } = useProfile();
  const departmentName = defaultBu?.department?.name ?? "";

  const values = useWatch({ control: form.control }) as FromPriceListFormValues;
  const items = (values.items ?? []) as FromPriceListSelectedItem[];

  const { data: workflow } = useWorkflowById(values.workflow_id ?? "");
  const { data: locationsRes, isLoading: locLoading } = useLocation({
    perpage: -1,
  });

  const locationMap = (() => {
    const m = new Map<string, string>();
    const list = Array.isArray(locationsRes) ? [] : (locationsRes?.data ?? []);
    for (const loc of list) m.set(loc.id, loc.name);
    return m;
  })();

  const totals = (() => {
    let subTotal = 0;
    let tax = 0;
    let grand = 0;
    for (const item of items) {
      const itemQty = item.locations.reduce(
        (sum, l) => sum + (Number(l.order_qty) || 0),
        0,
      );
      const itemSubTotal = round2(itemQty * item.price);
      const itemTax = round2((itemSubTotal * (item.tax_rate ?? 0)) / 100);
      subTotal += itemSubTotal;
      tax += itemTax;
      grand += itemSubTotal + itemTax;
    }
    return {
      subTotal: round2(subTotal),
      tax: round2(tax),
      grand: round2(grand),
    };
  })();

  return (
    <div className="space-y-4">
      {/* Section 1 — Order Details */}
      <Section
        icon={<ShoppingBag className="size-4" />}
        title={t("summaryOrderDetails")}
        editLabel={tc("edit")}
        onEdit={() => onEditStep(1)}
      >
        <dl>
          <DataRow label={tfl("orderDate")}>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays
                className="text-muted-foreground size-3.5"
                aria-hidden="true"
              />
              {values.order_date
                ? formatDate(values.order_date, dateFormat)
                : "—"}
            </span>
          </DataRow>
          <DataRow label={tfl("buyer")}>
            <span className="inline-flex items-center gap-1.5">
              <User
                className="text-muted-foreground size-3.5"
                aria-hidden="true"
              />
              {values.buyer_name || "—"}
            </span>
          </DataRow>
          <DataRow label={tfl("department")}>
            <span className="inline-flex items-center gap-1.5">
              <Building2
                className="text-muted-foreground size-3.5"
                aria-hidden="true"
              />
              {departmentName || "—"}
            </span>
          </DataRow>
          <DataRow label={tfl("workflow")}>
            <span className="inline-flex items-center gap-1.5">
              <WorkflowIcon
                className="text-muted-foreground size-3.5"
                aria-hidden="true"
              />
              {workflow?.name ?? "—"}
            </span>
          </DataRow>
          <DataRow label={tfl("deliveryDate")}>
            <span className="inline-flex items-center gap-1.5">
              <Truck
                className="text-muted-foreground size-3.5"
                aria-hidden="true"
              />
              {values.delivery_date
                ? formatDate(values.delivery_date, dateFormat)
                : "—"}
            </span>
          </DataRow>
        </dl>
      </Section>

      {/* Section 2 — Vendor */}
      <Section
        icon={<Truck className="size-4" />}
        title={t("summaryVendor")}
        editLabel={tc("edit")}
        onEdit={() => onEditStep(2)}
      >
        {values.vendor_id ? (
          <dl>
            <DataRow label={tfl("vendor")}>
              <span className="text-foreground font-medium">
                {values.vendor_name}
              </span>
            </DataRow>
            {values.currency_code && (
              <DataRow label={tfl("currency")}>
                <span className="inline-flex items-center gap-1.5">
                  <Coins
                    className="text-muted-foreground size-3.5"
                    aria-hidden="true"
                  />
                  <span className="text-xs font-semibold">
                    {values.currency_code}
                  </span>
                </span>
              </DataRow>
            )}
          </dl>
        ) : (
          <p className="text-muted-foreground text-sm">
            {t("noVendorSelected")}
          </p>
        )}
      </Section>

      {/* Section 3 — Items */}
      <Section
        icon={<Package className="size-4" />}
        title={`${t("summaryItems")} (${items.length})`}
        editLabel={tc("edit")}
        onEdit={() => onEditStep(3)}
      >
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("noProductsSelected")}
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => {
              const itemQty = item.locations.reduce(
                (sum, l) => sum + (Number(l.order_qty) || 0),
                0,
              );
              const lineTotal = round2(itemQty * item.price);
              return (
                <div
                  key={item.product_id ?? `item-${index}`}
                  className="border-border/40 overflow-hidden rounded-md border"
                >
                  <div className="bg-muted/20 flex items-center gap-3 border-b px-3 py-2">
                    <span className="text-muted-foreground w-6 text-center text-[0.6875rem] tabular-nums">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-[0.6875rem]">
                          {item.product_code}
                        </span>
                        <span className="truncate text-xs font-semibold">
                          {item.product_name}
                        </span>
                      </div>
                      {item.product_local_name && (
                        <p className="text-muted-foreground text-[0.625rem]">
                          {item.product_local_name}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold tabular-nums">
                        {item.price.toLocaleString()}
                      </p>
                      <p className="text-muted-foreground text-[0.625rem]">
                        / {item.order_unit_name || "—"}
                      </p>
                    </div>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground bg-muted/5 border-b">
                        <th
                          scope="col"
                          className="px-3 py-1 text-left text-[0.625rem] font-medium tracking-wide uppercase"
                        >
                          {tfl("location")}
                        </th>
                        <th
                          scope="col"
                          className="w-20 px-3 py-1 text-right text-[0.625rem] font-medium tracking-wide uppercase"
                        >
                          {tfl("qty")}
                        </th>
                        <th
                          scope="col"
                          className="w-24 px-3 py-1 text-right text-[0.625rem] font-medium tracking-wide uppercase"
                        >
                          {tfl("total")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-border/40 divide-y">
                      {item.locations.map((loc, locIdx) => {
                        const name = loc.id
                          ? (locationMap.get(loc.id) ?? loc.id)
                          : "—";
                        const rowTotal = round2(
                          (Number(loc.order_qty) || 0) * item.price,
                        );
                        return (
                          <tr key={locIdx}>
                            <td className="px-3 py-1.5">
                              {locLoading && loc.id ? (
                                <Skeleton className="h-3 w-24" />
                              ) : (
                                name
                              )}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums">
                              {Number(loc.order_qty).toLocaleString()}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums">
                              {rowTotal.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/10 border-t">
                        <td className="text-muted-foreground px-3 py-1.5 text-[0.6875rem]">
                          {t("totalQty")}
                        </td>
                        <td className="px-3 py-1.5 text-right text-xs font-semibold tabular-nums">
                          {itemQty.toLocaleString()}
                        </td>
                        <td className="px-3 py-1.5 text-right text-xs font-semibold tabular-nums">
                          {lineTotal.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })}

            {/* Grand totals */}
            <div className="border-border/60 mt-2 rounded-md border border-dashed p-3">
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    {t("summarySubtotal")}
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {totals.subTotal.toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("summaryTax")}</dt>
                  <dd className="font-medium tabular-nums">
                    {totals.tax.toLocaleString()}
                  </dd>
                </div>
                <div className="border-border/40 flex justify-between border-t pt-1.5 text-base">
                  <dt className="font-semibold">{t("summaryGrandTotal")}</dt>
                  <dd className="flex items-baseline gap-1.5 font-bold tabular-nums">
                    {values.currency_code && (
                      <span className="text-muted-foreground text-xs">
                        {values.currency_code}
                      </span>
                    )}
                    {totals.grand.toLocaleString()}
                  </dd>
                </div>
              </dl>
              <p className="text-muted-foreground mt-2 inline-flex items-center gap-1 text-[0.6875rem]">
                <Badge variant="secondary" size="xs">
                  {items.length} {tfl("products").toLowerCase()}
                </Badge>
                <span>·</span>
                <span>{values.vendor_name || "—"}</span>
              </p>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
