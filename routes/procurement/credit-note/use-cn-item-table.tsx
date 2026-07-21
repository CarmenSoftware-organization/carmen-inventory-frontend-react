import { memo, useEffect, useMemo } from "react";
import {
  useWatch,
  type Control,
  type FieldArrayWithId,
  type UseFormReturn,
} from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputSuffixAddon,
  InputSuffixField,
  InputSuffixInput,
  InputSuffixPlain,
} from "@/components/ui/input/input-suffix";
import {
  DiscountOverrideInput,
  TaxOverrideInput,
} from "@/components/procurement/discount-tax-override";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import { formatCurrency } from "@/lib/currency-utils";
import type { CnFormValues } from "./cn-form-schema";
import {
  computeCnItemAmounts,
  type CnCreditNoteType,
  type CnItemAmounts,
} from "./cn-item-compute";

export type CnItemField = FieldArrayWithId<CnFormValues, "items", "id">;

/** อ่านค่าที่ต้องใช้คำนวณของ item เดียว → computeCnItemAmounts (honor override) */
function useCnItemLine(
  form: UseFormReturn<CnFormValues>,
  index: number,
  type: CnCreditNoteType,
): CnItemAmounts {
  "use no memo";
  const [
    quantity,
    unitPrice,
    netAmount,
    discRate,
    discAmt,
    isDiscAdj,
    taxRate,
    taxAmt,
    isTaxAdj,
  ] = useWatch({
    control: form.control,
    name: [
      `items.${index}.quantity`,
      `items.${index}.unit_price`,
      `items.${index}.net_amount`,
      `items.${index}.discount_rate`,
      `items.${index}.discount_amount`,
      `items.${index}.is_discount_adjustment`,
      `items.${index}.tax_rate`,
      `items.${index}.tax_amount`,
      `items.${index}.is_tax_adjustment`,
    ] as const,
  });
  return computeCnItemAmounts(type, {
    quantity: Number(quantity) || 0,
    unit_price: Number(unitPrice) || 0,
    net_amount: Number(netAmount) || 0,
    discount_rate: Number(discRate) || 0,
    discount_amount: Number(discAmt) || 0,
    is_discount_adjustment: !!isDiscAdj,
    tax_rate: Number(taxRate) || 0,
    tax_amount: Number(taxAmt) || 0,
    is_tax_adjustment: !!isTaxAdj,
  });
}

/**
 * คำนวณ + set discount/net/tax/total ของ item — mount ตลอด (ทุก row) เพื่อให้ยอด
 * recompute เสมอ ตามประเภทใบลดหนี้ (quantity_return vs amount_discount)
 * — ไม่เขียนทับ net_amount ที่ผู้ใช้กรอก (amount_discount), discount_amount ที่
 * override (is_discount_adjustment) หรือ tax_amount ที่ override (is_tax_adjustment)
 */
export const CnItemComputedSync = memo(function CnItemComputedSync({
  control,
  form,
  index,
}: {
  control: Control<CnFormValues>;
  form: UseFormReturn<CnFormValues>;
  index: number;
}) {
  "use no memo";
  const type = useWatch({ control, name: "credit_note_type" });
  const [isDiscAdj, isTaxAdj] = useWatch({
    control,
    name: [
      `items.${index}.is_discount_adjustment`,
      `items.${index}.is_tax_adjustment`,
    ] as const,
  });
  const { discount_amount, net_amount, tax_amount, total_amount } =
    useCnItemLine(form, index, type);

  useEffect(() => {
    // amount_discount → ไม่มีส่วนลดต่อบรรทัด: ล้าง override/amount ที่ค้างจาก
    // quantity_return (กันยอด/payload เพี้ยนตอนสลับประเภท)
    if (type === "amount_discount") {
      if (isDiscAdj) {
        form.setValue(`items.${index}.is_discount_adjustment`, false);
      }
      if (form.getValues(`items.${index}.discount_amount`) !== 0) {
        form.setValue(`items.${index}.discount_amount`, 0);
      }
    } else if (!isDiscAdj) {
      // discount_amount: เขียนเฉพาะโหมด auto (override → คงค่า user)
      if (form.getValues(`items.${index}.discount_amount`) !== discount_amount) {
        form.setValue(`items.${index}.discount_amount`, discount_amount);
      }
    }
    if (form.getValues(`items.${index}.net_amount`) !== net_amount) {
      form.setValue(`items.${index}.net_amount`, net_amount);
    }
    // tax_amount: เขียนเฉพาะโหมด auto (override → คงค่า user)
    if (!isTaxAdj) {
      if (form.getValues(`items.${index}.tax_amount`) !== tax_amount) {
        form.setValue(`items.${index}.tax_amount`, tax_amount);
      }
    }
    if (form.getValues(`items.${index}.total_amount`) !== total_amount) {
      form.setValue(`items.${index}.total_amount`, total_amount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form is stable (useForm ref)
  }, [index, type, discount_amount, net_amount, tax_amount, total_amount, isDiscAdj, isTaxAdj]);

  return null;
});

/** Product — plain text เสมอ (เลือกจาก dialog แล้ว) */
function ProductCell({
  control,
  index,
}: {
  control: Control<CnFormValues>;
  index: number;
}) {
  "use no memo";
  const itemName = useWatch({ control, name: `items.${index}.item_name` }) ?? "";
  const productLocalName =
    useWatch({ control, name: `items.${index}.item_local_name` }) ?? "";
  return <NameWithSubtext primary={itemName} secondary={productLocalName} />;
}

/** Location — plain text เสมอ (เลือกจาก dialog แล้ว) */
function LocationCell({
  control,
  index,
}: {
  control: Control<CnFormValues>;
  index: number;
}) {
  "use no memo";
  const locationName =
    useWatch({ control, name: `items.${index}.location_name` }) ?? "";
  const locationCode =
    useWatch({ control, name: `items.${index}.location_code` }) ?? "";
  return <NameWithSubtext primary={locationName} secondary={locationCode} />;
}

/** Qty (+unit) — quantity_return แก้ได้ · amount_discount ล็อก (ref) */
function QtyCell({
  form,
  index,
  disabled,
  locked,
}: {
  form: UseFormReturn<CnFormValues>;
  index: number;
  disabled: boolean;
  locked: boolean;
}) {
  "use no memo";
  const t = useTranslations("procurement.creditNote");
  const quantity = useWatch({
    control: form.control,
    name: `items.${index}.quantity`,
  });
  const unitName =
    useWatch({ control: form.control, name: `items.${index}.unit_name` }) ?? "";
  const grnReceivedQty =
    useWatch({
      control: form.control,
      name: `items.${index}._grn_received_qty`,
    }) ?? 0;
  const error = form.formState.errors.items?.[index]?.quantity?.message;
  if (disabled || locked) {
    return (
      <InputSuffixPlain
        className="w-full"
        value={quantity != null ? String(quantity) : "—"}
        suffix={unitName}
      />
    );
  }
  // เตือน (ไม่ block) เมื่อคืนเกินจำนวนที่รับตาม GRN บรรทัดอ้างอิง — backend
  // เช็คสะสมข้ามใบอีกชั้นตอน submit (เพดานจริงอาจต่ำกว่านี้ถ้าเคยคืนไปแล้ว)
  const overReturn =
    grnReceivedQty > 0 && (Number(quantity) || 0) > grnReceivedQty;
  return (
    <>
      <InputSuffixField className="w-full" error={!!error}>
        <InputSuffixInput
          id={`items-${index}-quantity`}
          type="number"
          inputMode="decimal"
          min={1}
          placeholder="0"
          {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
        />
        {unitName && (
          <InputSuffixAddon>
            <span className="text-muted-foreground px-2 text-xs">
              {unitName}
            </span>
          </InputSuffixAddon>
        )}
      </InputSuffixField>
      {overReturn && (
        <p className="mt-0.5 text-right text-[0.7rem] text-amber-600 dark:text-amber-500">
          {t("overReturnWarning", { received: grnReceivedQty })}
        </p>
      )}
    </>
  );
}

/** Price — plain text เสมอ (ล็อกจาก GRN) */
function PriceCell({
  control,
  index,
}: {
  control: Control<CnFormValues>;
  index: number;
}) {
  "use no memo";
  const price = useWatch({ control, name: `items.${index}.unit_price` });
  return (
    <InputSuffixPlain
      className="w-full"
      value={formatCurrency(Number(price) || 0)}
    />
  );
}

/**
 * Subtotal / CN amount —
 * `amount_discount` → กรอก "CN Amount" (เขียน net_amount ตรง)
 * `quantity_return` → subtotal (qty × price) read-only
 */
function SubtotalCell({
  form,
  index,
  type,
  disabled,
}: {
  form: UseFormReturn<CnFormValues>;
  index: number;
  type: CnCreditNoteType;
  disabled: boolean;
}) {
  "use no memo";
  const isAmountDiscount = type === "amount_discount";
  const net = useWatch({
    control: form.control,
    name: `items.${index}.net_amount`,
  });
  const line = useCnItemLine(form, index, type);

  if (isAmountDiscount) {
    if (disabled) {
      return (
        <span className="text-foreground text-xs font-semibold tabular-nums">
          {formatCurrency(Number(net) || 0)}
        </span>
      );
    }
    return (
      <InputSuffixField className="w-full">
        <InputSuffixInput
          id={`items-${index}-cn-amount`}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          placeholder="0.00"
          {...form.register(`items.${index}.net_amount`, {
            valueAsNumber: true,
          })}
        />
      </InputSuffixField>
    );
  }
  // quantity_return → subtotal = qty × price (read-only)
  return (
    <span className="text-foreground text-xs font-semibold tabular-nums">
      {formatCurrency(line.sub_total)}
    </span>
  );
}

/**
 * Discount — override toggle + rate/amount combo (shared) เฉพาะ quantity_return
 * (amount_discount กรอก CN amount ตรง → ไม่มีส่วนลดต่อบรรทัด)
 */
function DiscountCell({
  form,
  index,
  type,
  disabled,
}: {
  form: UseFormReturn<CnFormValues>;
  index: number;
  type: CnCreditNoteType;
  disabled: boolean;
}) {
  "use no memo";
  const base = `items.${index}` as const;
  const rate =
    useWatch({ control: form.control, name: `${base}.discount_rate` }) ?? 0;
  const isAdj =
    useWatch({
      control: form.control,
      name: `${base}.is_discount_adjustment`,
    }) ?? false;
  const line = useCnItemLine(form, index, type);
  const amount = line.discount_amount;

  if (type === "amount_discount") {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  if (disabled) {
    return (
      <span className="block text-right text-xs tabular-nums">
        {rate}% · {formatCurrency(amount)}
      </span>
    );
  }
  return (
    // บรรทัดเดียว: combo (rate/amount) + checkbox override ชิดขวา (label "Override"
    // อยู่ที่ header row เพื่อไม่ให้แถวสูง)
    <div className="flex items-center gap-1.5">
      <div className="min-w-0 flex-1">
        <DiscountOverrideInput
          rate={rate}
          amount={amount}
          isAdjustment={isAdj}
          onRateChange={(r) =>
            form.setValue(`${base}.discount_rate`, r, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          onAmountChange={(a) =>
            form.setValue(`${base}.discount_amount`, a, { shouldDirty: true })
          }
        />
      </div>
      <Checkbox
        checked={isAdj}
        onCheckedChange={(v) => {
          const on = !!v;
          // เปิด override: seed amount = ค่าที่คำนวณล่าสุด (ต่อเนื่อง)
          if (on) {
            form.setValue(`${base}.discount_amount`, amount, {
              shouldDirty: true,
            });
          }
          form.setValue(`${base}.is_discount_adjustment`, on, {
            shouldDirty: true,
          });
        }}
        className="size-3.5 shrink-0"
        aria-label="Override discount"
      />
    </div>
  );
}

/** Net — = net_amount (subtotal − discount), read-only */
function NetCell({
  control,
  index,
}: {
  control: Control<CnFormValues>;
  index: number;
}) {
  "use no memo";
  const net = useWatch({ control, name: `items.${index}.net_amount` });
  return (
    <span className="text-foreground text-xs font-semibold tabular-nums">
      {formatCurrency(Number(net) || 0)}
    </span>
  );
}

/** Tax — override toggle + tax-profile/amount combo (shared, แบบ GRN/PO) */
function TaxCell({
  form,
  index,
  type,
  disabled,
}: {
  form: UseFormReturn<CnFormValues>;
  index: number;
  type: CnCreditNoteType;
  disabled: boolean;
}) {
  "use no memo";
  const base = `items.${index}` as const;
  const taxProfileId =
    useWatch({ control: form.control, name: `${base}.tax_profile_id` }) ?? null;
  const rate =
    useWatch({ control: form.control, name: `${base}.tax_rate` }) ?? 0;
  const isAdj =
    useWatch({ control: form.control, name: `${base}.is_tax_adjustment` }) ??
    false;
  const line = useCnItemLine(form, index, type);
  const amount = line.tax_amount;

  if (disabled) {
    return (
      <span className="block text-right text-xs tabular-nums">
        {rate}% · {formatCurrency(amount)}
      </span>
    );
  }
  return (
    // บรรทัดเดียว: combo (tax profile/amount) + checkbox override ชิดขวา
    // (label "Override" อยู่ที่ header row)
    <div className="flex items-center gap-1.5">
      <div className="min-w-0 flex-1">
        <TaxOverrideInput
          taxProfileId={taxProfileId}
          amount={amount}
          isAdjustment={isAdj}
          onTaxChange={(value, r, name) => {
            form.setValue(`${base}.tax_profile_id`, value || null, {
              shouldDirty: true,
              shouldValidate: true,
            });
            form.setValue(`${base}.tax_rate`, r);
            form.setValue(`${base}.tax_profile_name`, name);
          }}
          onAmountChange={(a) =>
            form.setValue(`${base}.tax_amount`, a, { shouldDirty: true })
          }
        />
      </div>
      <Checkbox
        checked={isAdj}
        onCheckedChange={(v) => {
          const on = !!v;
          if (on) {
            form.setValue(`${base}.tax_amount`, amount, { shouldDirty: true });
          }
          form.setValue(`${base}.is_tax_adjustment`, on, { shouldDirty: true });
        }}
        className="size-3.5 shrink-0"
        aria-label="Override tax"
      />
    </div>
  );
}

/** ยอดรวม (plain text) */
function TotalCell({
  control,
  index,
}: {
  control: Control<CnFormValues>;
  index: number;
}) {
  "use no memo";
  const v = useWatch({ control, name: `items.${index}.total_amount` });
  return (
    <span className="text-foreground text-xs font-semibold tabular-nums">
      {formatCurrency(Number(v) || 0)}
    </span>
  );
}

interface UseCnItemTableOptions {
  form: UseFormReturn<CnFormValues>;
  itemFields: CnItemField[];
  disabled: boolean;
  onDelete: (index: number) => void;
}

export function useCnItemTable({
  form,
  itemFields,
  disabled,
  onDelete,
}: UseCnItemTableOptions) {
  "use no memo";
  const t = useTranslations("procurement.creditNote");
  const tfl = useTranslations("field");
  const type = useWatch({
    control: form.control,
    name: "credit_note_type",
  }) as CnCreditNoteType;
  const isAmountDiscount = type === "amount_discount";

  const columns = useMemo<ColumnDef<CnItemField>[]>(() => {
    const rightMeta = {
      headerClassName: "text-right",
      cellClassName: "text-right",
    } as const;

    const indexColumn: ColumnDef<CnItemField> = {
      id: "index",
      header: "#",
      cell: ({ row }) => row.index + 1,
      enableSorting: false,
      enableResizing: false,
      size: 36,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center text-muted-foreground",
      },
    };

    const dataColumns: ColumnDef<CnItemField>[] = [
      {
        accessorKey: "item_id",
        header: tfl("product"),
        size: 240,
        cell: ({ row }) => (
          <ProductCell control={form.control} index={row.index} />
        ),
      },
      {
        accessorKey: "location_id",
        header: tfl("location"),
        size: 200,
        cell: ({ row }) => (
          <LocationCell control={form.control} index={row.index} />
        ),
      },
      {
        id: "quantity",
        header: tfl("receivedAbbr"),
        size: 160,
        meta: rightMeta,
        cell: ({ row }) => (
          <QtyCell
            form={form}
            index={row.index}
            disabled={disabled}
            locked={isAmountDiscount}
          />
        ),
      },
      {
        id: "unit_price",
        header: tfl("price"),
        size: 110,
        meta: rightMeta,
        cell: ({ row }) => (
          <PriceCell control={form.control} index={row.index} />
        ),
      },
      {
        id: "net_amount",
        header: isAmountDiscount ? t("cnAmount") : tfl("subtotalAbbr"),
        size: 130,
        meta: rightMeta,
        cell: ({ row }) => (
          <SubtotalCell
            form={form}
            index={row.index}
            type={type}
            disabled={disabled}
          />
        ),
      },
      {
        id: "discount",
        // edit: label "Override" ที่ header (justify-between) — checkbox ต่อแถวอยู่ใต้พอดี
        header:
          disabled || isAmountDiscount
            ? tfl("discount")
            : () => (
                <div className="flex w-full items-center justify-between gap-2">
                  <span>{tfl("discount")}</span>
                  <span className="text-muted-foreground text-[0.7rem] font-normal">
                    {tfl("override")}
                  </span>
                </div>
              ),
        size: 200,
        meta: rightMeta,
        cell: ({ row }) => (
          <DiscountCell
            form={form}
            index={row.index}
            type={type}
            disabled={disabled}
          />
        ),
      },
      {
        id: "net",
        header: tfl("net"),
        size: 110,
        meta: rightMeta,
        cell: ({ row }) => <NetCell control={form.control} index={row.index} />,
      },
      {
        id: "tax",
        header: disabled
          ? tfl("tax")
          : () => (
              <div className="flex w-full items-center justify-between gap-2">
                <span>{tfl("tax")}</span>
                <span className="text-muted-foreground text-[0.7rem] font-normal">
                  {tfl("override")}
                </span>
              </div>
            ),
        size: 250,
        meta: rightMeta,
        cell: ({ row }) => (
          <TaxCell
            form={form}
            index={row.index}
            type={type}
            disabled={disabled}
          />
        ),
      },
      {
        id: "total_amount",
        header: tfl("amountAbbr"),
        size: 120,
        meta: rightMeta,
        cell: ({ row }) => (
          <TotalCell control={form.control} index={row.index} />
        ),
      },
    ];

    const actionColumn: ColumnDef<CnItemField> = {
      id: "action",
      header: () => "",
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          aria-label="Remove"
          onClick={() => onDelete(row.index)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      ),
      enableSorting: false,
      enableResizing: false,
      size: 40,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center",
      },
    };

    const baseCols = [
      indexColumn,
      ...dataColumns,
      ...(disabled ? [] : [actionColumn]),
    ];

    return baseCols.map((col) => ({
      ...col,
      meta: {
        ...col.meta,
        cellClassName: cn("py-1 align-middle", col.meta?.cellClassName),
      },
    }));
  }, [form, disabled, isAmountDiscount, type, t, tfl, onDelete]);

  const table = useReactTable({
    data: itemFields,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return table;
}
