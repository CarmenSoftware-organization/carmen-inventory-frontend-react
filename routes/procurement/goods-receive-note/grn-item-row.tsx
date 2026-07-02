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
import { LookupProductLocation } from "@/components/lookup/lookup-product-location";
import { inventoryTypeLabelKey } from "@/constant/location";
import { formatCurrency } from "@/lib/currency-utils";
import type { GrnFormValues } from "./grn-form-schema";
import { GrnItemExpanded } from "./grn-item-expanded";
import { FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";

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

  const netAmount = useWatch({
    control: form.control,
    name: `items.${index}.net_amount`,
  });

  // เริ่ม expand เองถ้าเป็น manual ที่ยังไม่ได้เลือก location (ต้องกรอกก่อน)
  const [expanded, setExpanded] = useState(isManual && !locationId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // subscribe เฉพาะ error ของ item นี้ — รับประกัน re-render เมื่อ validation ของแถวเปลี่ยน
  const { errors } = useFormState({
    control: form.control,
    name: `items.${index}`,
  });
  const itemError = errors.items?.[index];
  const locationError = itemError?.location_id?.message;

  // มี field error ที่ไหนก็ได้ใน item (location/qty/unit/pricing) → บังคับ expand
  // ให้ field ผิด render เข้า DOM แล้ว scrollToFirstInvalidField (retry ต่อเฟรม) scroll ไปหาเอง
  const showExpanded = expanded || !!itemError;

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
          "hover:bg-muted/40",
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
              <div className="flex items-center gap-1">
                <MapPin className="text-muted-foreground size-3 shrink-0" />
                <span
                  className={cn(
                    "truncate text-xs font-medium",
                    locationError ? "text-destructive" : "text-foreground",
                  )}
                >
                  {locationName || (locationError ? locationError : "—")}
                </span>
                {(locationCode || typeLabel) && (
                  <>
                    <Badge size={"xs"} variant={"secondary"}>
                      {locationCode}
                    </Badge>
                    <Badge size={"xs"} variant={"secondary"}>
                      {typeLabel}
                    </Badge>
                  </>
                )}
              </div>
            </>
          )}
        </span>
        <span className="text-foreground w-20 text-right text-xs font-semibold tabular-nums">
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
        <GrnItemExpanded
          form={form}
          index={index}
          disabled={disabled}
          docType={docType}
        />
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
