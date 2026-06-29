
import { useTranslations } from "use-intl";
import { Eye, FileEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * ModeToggle — segmented View / Edit toggle
 *
 * ใช้บน header ของ PO ขวาบน (เฉพาะตอนมี existing PO ไม่ใช่ add mode)
 *
 * @param props.mode - "view" หรือ "edit"
 * @param props.onChange - callback เปลี่ยน mode
 * @param props.disabled - disable ทั้ง toggle (e.g. ระหว่าง mutation pending)
 */
export function ModeToggle({
  mode,
  onChange,
  disabled,
}: {
  readonly mode: "view" | "edit";
  readonly onChange: (next: "view" | "edit") => void;
  readonly disabled?: boolean;
}) {
  const tc = useTranslations("common");
  const opts: { k: "view" | "edit"; label: string; icon: typeof Eye }[] = [
    { k: "view", label: tc("view"), icon: Eye },
    { k: "edit", label: tc("edit"), icon: FileEdit },
  ];
  return (
    <div
      className={cn(
        "border-border/60 bg-muted/40 inline-flex rounded-lg border p-0.5",
        disabled && "opacity-60",
      )}
      role="tablist"
      aria-label="View or edit mode"
    >
      {opts.map(({ k, label, icon: Icon }) => {
        const active = mode === k;
        return (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(k)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors",
              active
                ? k === "edit"
                  ? "bg-primary text-primary-foreground"
                  : "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
              disabled && "cursor-not-allowed",
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * OrderSummaryCard — hero summary card with rows + huge grand total
 *
 * ใช้ที่ Section 3 ด้านขวา รวม Subtotal/Net/Tax/Discount + Grand total ตัวใหญ่
 *
 * @param props.subTotal - subtotal (ก่อน discount/tax)
 * @param props.net - net (sub - discount)
 * @param props.tax - tax
 * @param props.discount - discount (ถ้า > 0 จะแสดง pill เขียวบอก "Discount saved")
 * @param props.grandTotal - ยอดรวมสุดท้าย
 * @param props.itemCount - จำนวน line items (สำหรับ footer text)
 * @param props.qtyCount - จำนวน units รวม (สำหรับ footer text)
 * @param props.currencyCode - รหัสสกุลเงิน (เช่น "THB")
 */
export function OrderSummaryCard({
  subTotal,
  net,
  tax,
  discount,
  grandTotal,
  itemCount,
  qtyCount,
  currencyCode,
}: {
  readonly subTotal: number;
  readonly net: number;
  readonly tax: number;
  readonly discount: number;
  readonly grandTotal: number;
  readonly itemCount: number;
  readonly qtyCount: number;
  readonly currencyCode: string;
}) {
  const tfl = useTranslations("field");
  const t = useTranslations("procurement.purchaseOrder");
  const rows: Array<readonly [string, string, number]> = [
    ["subtotal", tfl("subtotal"), subTotal],
    ["net", tfl("net"), net],
    ["tax", tfl("tax"), tax],
  ];
  return (
    <aside className="border-border/40 bg-muted/20 self-start rounded-xl border p-5">
      <p className="text-muted-foreground text-[0.625rem] font-semibold">
        {tfl("orderSummary")}
      </p>
      <dl className="mt-3 space-y-1">
        {rows.map(([key, label, v]) => (
          <div
            key={key}
            className="flex items-baseline justify-between py-1 text-sm"
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-foreground/80 font-semibold tabular-nums">
              {v.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              <span className="text-muted-foreground text-[0.625rem]">
                {currencyCode}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      {discount > 0 && (
        <div className="bg-success/10 text-success mt-2 flex items-center justify-between rounded-md px-2 py-1.5">
          <span className="text-xs font-semibold">{tfl("discountSaved")}</span>
          <span className="text-xs font-semibold tabular-nums">
            −
            {discount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      )}
      <div className="border-border/60 mt-4 border-t pt-3">
        <p className="text-primary text-[0.625rem] font-semibold">
          {tfl("grandTotal")}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-primary text-3xl font-semibold tracking-tight tabular-nums">
            {grandTotal.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span className="text-muted-foreground text-sm font-semibold">
            {currencyCode}
          </span>
        </div>
        <p className="text-muted-foreground mt-2 text-[0.6875rem]">
          {t("summaryItemsUnits", { itemCount, qtyCount })}
        </p>
      </div>
    </aside>
  );
}

/**
 * SectionAddAction — "Add line" style ghost button สำหรับ section header (Section 2)
 *
 * เป็น shorthand ปุ่ม `<Button variant="ghost" size="xs">` ใช้ใน NumberedSection.action
 */
export function SectionAddAction({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  readonly label: string;
  readonly icon: typeof Eye;
  readonly onClick: () => void;
  readonly disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </Button>
  );
}
