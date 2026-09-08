import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import {
  Controller,
  useFieldArray,
  useWatch,
  type UseFormReturn,
} from "react-hook-form";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { InputSuffixPlain } from "@/components/ui/input/input-suffix";
import { LookupProductLocation } from "@/components/lookup/lookup-product-location";
import { useUnitDecimals } from "@/hooks/use-product-units";
import { fieldFocusRef } from "@/lib/field-focus";
import { useAddLocationRegistry } from "./po-locations-add-context";
import { poItemCols } from "./po-item-columns";
import type { PoFormValues } from "./po-form-schema";
import {
  LocationAmountCell,
  LocationDiscountCell,
  LocationPriceText,
  LocationQtyInput,
  LocationTaxCell,
} from "./po-item-cells/location-cells";

interface Props {
  readonly form: UseFormReturn<PoFormValues>;
  readonly index: number;
  /** location id/qty/add/delete แก้ได้ไหม (locationsDisabled) */
  readonly disabled: boolean;
  /** item-level fields (Disc%/Tax) แก้ได้ไหม (item disabled) */
  readonly fieldsDisabled: boolean;
  readonly readOnly: boolean;
  /** main row มี action column (align delete ให้ตรง) */
  readonly showActionCol: boolean;
  /** เพิ่งกรอกราคาเสร็จ — กางตัวเลือกคลังของแถวแรกต่อให้เลย */
  readonly locationOpen?: boolean;
  readonly onLocationOpenChange?: (open: boolean) => void;
}

export function LocationsEditor({
  form,
  index,
  disabled,
  fieldsDisabled,
  readOnly,
  showActionCol,
  locationOpen,
  onLocationOpenChange,
}: Props) {
  "use no memo";
  const t = useTranslations("procurement.purchaseOrder");
  const productId =
    useWatch({ control: form.control, name: `items.${index}.product_id` }) ??
    "";
  // location ต้องมาจากรายการที่ workflow ของ PO ใบนี้อนุญาต ไม่ใช่ทุกคลังที่ user เห็น
  const workflowId =
    useWatch({ control: form.control, name: "workflow_id" }) ?? "";
  const unitName =
    useWatch({
      control: form.control,
      name: `items.${index}.order_unit_name`,
    }) ?? "";
  const unitId =
    useWatch({
      control: form.control,
      name: `items.${index}.order_unit_id`,
    }) ?? "";
  // ทศนิยมที่กรอกได้มาจาก decimal_place ของหน่วยที่เลือก (master data)
  const decimals = useUnitDecimals(productId, unitId);

  const { fields, prepend, remove } = useFieldArray({
    control: form.control,
    name: `items.${index}.locations`,
  });
  const watchedLocations = useWatch({
    control: form.control,
    name: `items.${index}.locations`,
  });

  const locEditable = !disabled && !readOnly; // location id/qty/add/delete
  const fieldsEditable = !fieldsDisabled && !readOnly; // Disc%/Tax
  const [deleteLocIndex, setDeleteLocIndex] = useState<number | null>(null);

  const addRegistry = useAddLocationRegistry();
  useEffect(() => {
    if (!addRegistry || !locEditable) return;
    addRegistry.set(index, () =>
      prepend({
        id: "",
        location_code: "",
        location_name: "",
        order_qty: 0,
        received_qty: 0,
        discount_rate: 0,
        discount_amount: 0,
        is_discount_adjustment: false,
        tax_profile_id: null,
        tax_profile_name: "",
        tax_rate: 0,
        tax_amount: 0,
        is_tax_adjustment: false,
      }),
    );
    return () => {
      addRegistry.delete(index);
    };
  }, [addRegistry, locEditable, index, prepend]);

  // คอลัมน์ align กับ product row — % ของ (data + action ถ้ามี)
  // showActionCol = !disabled && !readOnly ของ main row — ใช้ค่าเดียวกันคุม
  // ความกว้าง คอลัมน์สองตารางจึงตรงกันทั้งโหมดอ่านและโหมดแก้
  const { col: PO_COL, dataTotal } = poItemCols(showActionCol);
  const denom = dataTotal + (showActionCol ? PO_COL.action : 0);
  const pct = (px: number) => `${(px / denom) * 100}%`;
  const colCount = 10 + (showActionCol ? 1 : 0);

  return (
    <div>
      <table className="w-full table-fixed border-separate border-spacing-0 text-xs">
        <colgroup>
          <col style={{ width: pct(PO_COL.product) }} />
          <col style={{ width: pct(PO_COL.unit) }} />
          <col style={{ width: pct(PO_COL.order) }} />
          <col style={{ width: pct(PO_COL.rec) }} />
          <col style={{ width: pct(PO_COL.price) }} />
          <col style={{ width: pct(PO_COL.sub) }} />
          <col style={{ width: pct(PO_COL.discount) }} />
          <col style={{ width: pct(PO_COL.net) }} />
          <col style={{ width: pct(PO_COL.tax) }} />
          <col style={{ width: pct(PO_COL.amt) }} />
          {showActionCol && <col style={{ width: pct(PO_COL.action) }} />}
        </colgroup>
        <tbody className="divide-border/60 divide-y">
          {fields.length === 0 && (
            <tr>
              <td
                colSpan={colCount}
                className="text-muted-foreground py-3 text-center"
              >
                —
              </td>
            </tr>
          )}
          {fields.map((loc, locIndex) => {
            const locErrors =
              form.formState.errors.items?.[index]?.locations?.[locIndex];
            const locIdError = locErrors?.id?.message;
            const reqQtyError = locErrors?.order_qty?.message;
            return (
              <tr
                key={loc.id}
                className="hover:bg-muted/40 h-11 align-middle transition-colors"
              >
                {/* Location — กิน 2 คอลัมน์ (product + unit) เพราะช่องเลือกคลัง
                    ยาวกว่าชื่อสินค้า และคอลัมน์ unit ของแถวนี้ว่างอยู่แล้ว
                    (หน่วยเป็นของรายการสินค้า ทุกคลังใช้ตัวเดียวกัน) — คอลัมน์ที่
                    เหลือยังตรงกับตารางแถวสินค้าเหมือนเดิม */}
                <td className="px-3 py-1" colSpan={2}>
                  <Controller
                    control={form.control}
                    name={`items.${index}.locations.${locIndex}.id`}
                    render={({ field, fieldState }) => (
                      <LookupProductLocation
                        productId={productId}
                        workflowId={workflowId}
                        value={field.value}
                        onValueChange={field.onChange}
                        onItemChange={(loc) => {
                          // capture meta ของ location → ส่งใน payload (backend)
                          const b =
                            `items.${index}.locations.${locIndex}` as const;
                          form.setValue(`${b}.location_code`, loc.code ?? "");
                          form.setValue(`${b}.location_name`, loc.name ?? "");
                        }}
                        disabled={!locEditable}
                        readOnly={!locEditable}
                        excludeIds={(watchedLocations ?? [])
                          .map((l, i) => (i === locIndex ? null : l?.id))
                          .filter((id): id is string => !!id)}
                        // เปิดเฉพาะแถวแรก — กรอกราคาเสร็จครั้งเดียวไม่ควรกาง
                        // ตัวเลือกของทุกคลังพร้อมกัน
                        open={locIndex === 0 && locationOpen ? true : undefined}
                        onOpenChange={onLocationOpenChange}
                        nextFocusRef={fieldFocusRef(
                          `items.${index}.locations.${locIndex}.order_qty`,
                        )}
                        className="w-full text-xs"
                        error={fieldState.error?.message ?? locIdError}
                      />
                    )}
                  />
                </td>
                {/* order qty */}
                <td className="px-3 py-1 text-right">
                  {locEditable ? (
                    <LocationQtyInput
                      form={form}
                      itemIndex={index}
                      locIndex={locIndex}
                      error={reqQtyError}
                      unitName={unitName}
                      decimals={decimals}
                    />
                  ) : (
                    <InputSuffixPlain
                      className="block w-full text-right"
                      value={watchedLocations?.[locIndex]?.order_qty ?? 0}
                      suffix={unitName}
                    />
                  )}
                </td>
                {/* received (read-only ใน PO) */}
                <td className="px-3 py-1 text-right">
                  <InputSuffixPlain
                    className="block w-full text-right"
                    value={watchedLocations?.[locIndex]?.received_qty ?? 0}
                    suffix={unitName}
                  />
                </td>
                {/* unit price (item-level, read-only text) */}
                <td className="px-3 py-1 text-right">
                  <LocationPriceText form={form} itemIndex={index} />
                </td>
                {/* sub */}
                <td className="px-3 py-1 text-right">
                  <LocationAmountCell
                    form={form}
                    itemIndex={index}
                    locIndex={locIndex}
                    field="sub_total_price"
                  />
                </td>
                {/* discount combo (rate/amount + override) — nowrap เพราะโหมดดู
                    เป็น "10% · 320.00" ซึ่งยาวกว่าคอลัมน์เมื่อหักระยะขอบออก */}
                <td className="px-3 py-1 whitespace-nowrap">
                  <LocationDiscountCell
                    form={form}
                    itemIndex={index}
                    locIndex={locIndex}
                    editable={fieldsEditable}
                  />
                </td>
                {/* net */}
                <td className="px-3 py-1 text-right">
                  <LocationAmountCell
                    form={form}
                    itemIndex={index}
                    locIndex={locIndex}
                    field="net_amount"
                  />
                </td>
                {/* tax combo (profile/amount + override) — nowrap เหมือนส่วนลด */}
                <td className="px-3 py-1 whitespace-nowrap">
                  <LocationTaxCell
                    form={form}
                    itemIndex={index}
                    locIndex={locIndex}
                    editable={fieldsEditable}
                  />
                </td>
                {/* amt */}
                <td className="px-3 py-1 text-right font-semibold">
                  <LocationAmountCell
                    form={form}
                    itemIndex={index}
                    locIndex={locIndex}
                    field="total_price"
                  />
                </td>
                {showActionCol && (
                  <td className="px-3 py-1 text-center">
                    {locEditable && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                            aria-label={t("removeLocation")}
                            onClick={() => setDeleteLocIndex(locIndex)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        {/* ถังขยะเหมือนของแถวสินค้า แต่ลบแค่ที่เก็บเดียว */}
                        <TooltipContent>{t("removeLocation")}</TooltipContent>
                      </Tooltip>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      <DeleteDialog
        open={deleteLocIndex !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteLocIndex(null);
        }}
        title={t("removeLocation")}
        description={t("removeLocationConfirm")}
        onConfirm={() => {
          if (deleteLocIndex !== null) remove(deleteLocIndex);
          setDeleteLocIndex(null);
        }}
      />
    </div>
  );
}
