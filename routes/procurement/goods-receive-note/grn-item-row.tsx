import { memo, useState } from "react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { ChevronRight, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { LookupProductLocation } from "@/components/lookup/lookup-product-location";
import { inventoryTypeLabelKey } from "@/constant/location";
import { formatCurrency } from "@/lib/currency-utils";
import type { GrnFormValues } from "./grn-form-schema";
import GrnTabQty from "./grn-tab-qty";
import GrnTabPricing from "./grn-tab-pricing";
import GrnTabDetails from "./grn-tab-details";
import { FieldLabel } from "@/components/ui/field";

interface GrnItemRowProps {
  readonly index: number;
  readonly form: UseFormReturn<GrnFormValues>;
  readonly disabled: boolean;
  readonly isManual: boolean;
  readonly showDelete: boolean;
  readonly onDelete: () => void;
  readonly groupIndices: number[];
  /** เปิด location lookup อัตโนมัติตอน mount (row ที่เพิ่งเพิ่ม) */
  readonly autoOpenLocation?: boolean;
}

const EYEBROW =
  "text-muted-foreground text-[0.625rem] font-semibold tracking-wider uppercase";

/**
 * แถว location ของ GRN item — collapsed = summary อ่านอย่างเดียว,
 * คลิก chevron เพื่อ expand เผยฟอร์มแก้ไข inline (Quantity / Pricing / Details)
 * แทนการเปิด sheet แยก. ฟอร์มแต่ละ section reuse GrnTab* เดิม (logic/คำนวณไม่แตะ)
 */
export const GrnItemRow = memo(function GrnItemRow({
  index,
  form,
  disabled,
  isManual,
  showDelete,
  onDelete,
  groupIndices,
  autoOpenLocation,
}: GrnItemRowProps) {
  "use no memo";
  const tfl = useTranslations("field");
  const tl = useTranslations("config.location");

  const docType = useWatch({ control: form.control, name: "doc_type" }) ?? "";
  const locationName =
    useWatch({ control: form.control, name: `items.${index}.location_name` }) ??
    "";
  const locationCode =
    useWatch({ control: form.control, name: `items.${index}.location_code` }) ??
    "";
  const locationType =
    useWatch({ control: form.control, name: `items.${index}.location_type` }) ??
    "";
  const locationId =
    useWatch({ control: form.control, name: `items.${index}.location_id` }) ??
    "";
  const productId =
    useWatch({ control: form.control, name: `items.${index}.product_id` }) ??
    "";
  // location ของ sibling rows ใน group เดียวกัน — reactive เพื่อกันเลือกซ้ำ
  const siblingLocationIds = useWatch({
    control: form.control,
    name: groupIndices
      .filter((i) => i !== index)
      .map((i) => `items.${i}.location_id` as const),
  });
  const excludeLocationIds = (siblingLocationIds ?? []).filter(
    (v): v is string => !!v,
  );
  const receivedQty = useWatch({
    control: form.control,
    name: `items.${index}.received_qty`,
  });
  const netAmount = useWatch({
    control: form.control,
    name: `items.${index}.net_amount`,
  });

  // เริ่ม expand เองถ้าเป็น manual ที่ยังไม่ได้เลือก location (ต้องกรอกก่อน)
  const [expanded, setExpanded] = useState(isManual && !locationId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const locationError =
    form.formState.errors.items?.[index]?.location_id?.message;

  const typeLabel = (() => {
    if (!locationType) return "";
    const k = inventoryTypeLabelKey(locationType);
    return k ? tl(k) : locationType.toUpperCase();
  })();

  return (
    <div>
      {/* ── Collapsed summary ── */}
      <div
        className={cn(
          "flex items-center gap-2.5 py-3 pr-4 pl-8 transition-colors",
          expanded ? "bg-muted/20" : "hover:bg-muted/20",
        )}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? tfl("collapse") : tfl("expand")}
          className={cn(
            "-m-1 flex shrink-0 items-center p-1 transition-colors",
            expanded
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ChevronRight
            className={cn(
              "size-4 transition-transform",
              expanded && "rotate-90",
            )}
            aria-hidden="true"
          />
        </button>

        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          {isManual && !disabled ? (
            <div className="min-w-0 flex-1 space-y-2">
              <FieldLabel required className="text-xs">
                <MapPin className="text-muted-foreground size-3 shrink-0" />
                {tfl("location")}
              </FieldLabel>
              <Controller
                control={form.control}
                name={`items.${index}.location_id`}
                render={({ field, fieldState }) => (
                  <LookupProductLocation
                    productId={productId}
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    onItemChange={(location) => {
                      form.setValue(
                        `items.${index}.location_name`,
                        location.name,
                      );
                      form.setValue(
                        `items.${index}.location_code`,
                        location.code,
                      );
                      form.setValue(
                        `items.${index}.location_type`,
                        location.location_type,
                      );
                    }}
                    defaultLabel={locationName || undefined}
                    excludeIds={excludeLocationIds}
                    disabled={!productId}
                    defaultOpen={autoOpenLocation}
                    className="h-8 w-full text-xs"
                    modal
                    error={fieldState.error?.message}
                  />
                )}
              />
            </div>
          ) : (
            <>
              <span
                className={cn(
                  "truncate text-[0.8125rem] font-medium",
                  locationError ? "text-destructive" : "text-foreground",
                )}
              >
                {locationName || (locationError ? locationError : "—")}
              </span>
              {(locationCode || typeLabel) && (
                <span className="text-muted-foreground shrink-0 text-xs">
                  {[locationCode, typeLabel].filter(Boolean).join(" · ")}
                </span>
              )}
            </>
          )}
        </span>
        <span className="text-foreground w-20 text-right text-[0.8125rem] font-semibold tabular-nums">
          {formatCurrency(Number(netAmount) || 0)}
        </span>
        {showDelete && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive ml-1 shrink-0"
            aria-label={tfl("deleteLocation")}
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>

      {/* ── Expanded editor (inline, replaces the old sheet) ── */}
      {expanded && (
        <div className="bg-muted/20 space-y-4 px-4 pt-2 pb-4 pl-8">
          <section className="space-y-2">
            <p className={EYEBROW}>{tfl("quantity")}</p>
            <GrnTabQty
              form={form}
              index={index}
              disabled={disabled}
              docType={docType}
            />
          </section>

          <section className="space-y-2 border-t pt-3">
            <p className={EYEBROW}>{tfl("pricing")}</p>
            <GrnTabPricing form={form} index={index} disabled={disabled} />
          </section>

          <section className="space-y-2 border-t pt-3">
            <p className={EYEBROW}>{tfl("details")}</p>
            <GrnTabDetails form={form} index={index} disabled={disabled} />
          </section>
        </div>
      )}

      <DeleteDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={tfl("deleteLocation")}
        description={locationName || undefined}
        onConfirm={() => {
          onDelete();
          setShowDeleteConfirm(false);
        }}
      />
    </div>
  );
});
