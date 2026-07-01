import { memo, useState } from "react";
import {
  Controller,
  useFormState,
  useWatch,
  type UseFormReturn,
} from "react-hook-form";
import { useTranslations } from "use-intl";
import { ChevronRight, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { LookupGrnProductLocation } from "@/components/lookup/lookup-grn-product-location";
import { formatCurrency } from "@/lib/currency-utils";
import { FieldLabel } from "@/components/ui/field";
import type { CnFormValues } from "./cn-form-schema";
import CnTabQty from "./cn-tab-qty";
import CnTabPricing from "./cn-tab-pricing";
import CnTabDetails from "./cn-tab-details";

interface CnItemRowProps {
  readonly index: number;
  readonly form: UseFormReturn<CnFormValues>;
  readonly disabled: boolean;
  readonly showDelete: boolean;
  readonly onDelete: () => void;
  readonly groupIndices: number[];
  /** เปิด location lookup อัตโนมัติตอน mount (row ที่เพิ่งเพิ่ม) */
  readonly autoOpenLocation?: boolean;
}

const EYEBROW =
  "text-muted-foreground text-[0.625rem] font-semibold tracking-wider uppercase";

/**
 * แถว location ของ CN item — collapsed = summary อ่านอย่างเดียว,
 * คลิก chevron เพื่อ expand เผยฟอร์มแก้ไข inline (Quantity / Pricing / Details)
 * แทนการเปิด sheet แยก. ฟอร์มแต่ละ section reuse CnTab* (logic/คำนวณไม่แตะ)
 */
export const CnItemRow = memo(function CnItemRow({
  index,
  form,
  disabled,
  showDelete,
  onDelete,
  groupIndices,
  autoOpenLocation,
}: CnItemRowProps) {
  "use no memo";
  const tfl = useTranslations("field");

  const grnId = useWatch({ control: form.control, name: "grn_id" }) || undefined;
  const locationName =
    useWatch({ control: form.control, name: `items.${index}.location_name` }) ??
    "";
  const locationId =
    useWatch({ control: form.control, name: `items.${index}.location_id` }) ??
    "";
  const productId =
    useWatch({ control: form.control, name: `items.${index}.item_id` }) ?? "";
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

  const netAmount = useWatch({
    control: form.control,
    name: `items.${index}.net_amount`,
  });

  // เริ่ม expand เองถ้ายังไม่ได้เลือก location (ต้องกรอกก่อน)
  const [expanded, setExpanded] = useState(!disabled && !locationId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // subscribe เฉพาะ error ของ item นี้ — รับประกัน re-render เมื่อ validation ของแถวเปลี่ยน
  const { errors } = useFormState({
    control: form.control,
    name: `items.${index}`,
  });
  const itemError = errors.items?.[index];
  const locationError = itemError?.location_id?.message;

  // มี field error ที่ไหนก็ได้ใน item (location/qty/unit/pricing) → บังคับ expand
  const showExpanded = expanded || !!itemError;

  return (
    <div>
      {/* ── Collapsed summary ── */}
      <div
        className={cn(
          "flex items-center gap-2.5 py-3 pr-4 pl-8 transition-colors",
          showExpanded ? "bg-muted/20" : "hover:bg-muted/20",
        )}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={showExpanded}
          aria-label={showExpanded ? tfl("collapse") : tfl("expand")}
          className={cn(
            "-m-1 flex shrink-0 items-center p-1 transition-colors",
            showExpanded
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ChevronRight
            className={cn(
              "size-4 transition-transform",
              showExpanded && "rotate-90",
            )}
            aria-hidden="true"
          />
        </button>

        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          {!disabled ? (
            <div className="min-w-0 flex-1 space-y-2">
              <FieldLabel required className="text-xs">
                <MapPin className="text-muted-foreground size-3 shrink-0" />
                {tfl("location")}
              </FieldLabel>
              <Controller
                control={form.control}
                name={`items.${index}.location_id`}
                render={({ field, fieldState }) => (
                  <LookupGrnProductLocation
                    grnId={grnId}
                    productId={productId || undefined}
                    value={field.value ?? ""}
                    onValueChange={(value, location) => {
                      field.onChange(value);
                      form.setValue(
                        `items.${index}.location_name`,
                        location?.location_name ?? "",
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
            <div className="flex items-center gap-1">
              <MapPin className="text-muted-foreground size-3 shrink-0" />
              <span
                className={cn(
                  "truncate text-[0.8125rem] font-medium",
                  locationError ? "text-destructive" : "text-foreground",
                )}
              >
                {locationName || (locationError ? locationError : "—")}
              </span>
            </div>
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
      {showExpanded && (
        <div className="bg-muted/20 space-y-4 px-4 pt-2 pb-4 pl-8">
          <section className="space-y-2">
            <p className={EYEBROW}>{tfl("quantity")}</p>
            <CnTabQty form={form} index={index} disabled={disabled} />
          </section>

          <section className="space-y-2 border-t pt-3">
            <p className={EYEBROW}>{tfl("pricing")}</p>
            <CnTabPricing form={form} index={index} disabled={disabled} />
          </section>

          <section className="space-y-2 border-t pt-3">
            <p className={EYEBROW}>{tfl("details")}</p>
            <CnTabDetails form={form} index={index} disabled={disabled} />
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
