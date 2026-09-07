import { memo, useEffect, useMemo, useRef } from "react";
import {
  Controller,
  useWatch,
  type Control,
  type UseFormReturn,
} from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  type ColumnDef,
  type Row,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronRight, MapPinPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InputAmount } from "@/components/ui/input/input-amount";
import { InputSuffixPlain } from "@/components/ui/input/input-suffix";
import { cn } from "@/lib/utils";
import { LookupProduct } from "@/components/lookup/lookup-product";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import { useProductUnits } from "@/hooks/use-product-units";
import { useProductById } from "@/hooks/use-product";
import { formatCurrency } from "@/lib/currency-utils";
import type { GrnFormValues } from "./grn-form-schema";
import { GrnLocationRow } from "./grn-location-row";
import { grnItemCols } from "./grn-item-columns";

/** 1 product group = 1 แถวใน DataGrid (product + N location indices) */
export interface GrnGroup {
  key: string;
  productName: string;
  isManual: boolean;
  indices: number[];
}

/** Product lookup (manual) — set product ให้ทุก index ในกลุ่ม */
const ManualProductCell = memo(function ManualProductCell({
  form,
  indices,
  disabled,
  defaultOpen,
  onPicked,
}: {
  form: UseFormReturn<GrnFormValues>;
  indices: number[];
  disabled: boolean;
  defaultOpen?: boolean;
  onPicked?: () => void;
}) {
  "use no memo";
  const primaryIndex = indices[0];
  return (
    <Controller
      control={form.control}
      name={`items.${primaryIndex}.product_id`}
      render={({ field, fieldState }) => (
        <LookupProduct
          value={field.value ?? ""}
          onValueChange={(value, product) => {
            field.onChange(value);
            if (product) {
              form.setValue(
                `items.${primaryIndex}.product_name`,
                product.name,
                {
                  shouldDirty: true,
                },
              );
            }
            // sibling rows shouldDirty ด้วย — ไม่งั้น dirtyFields ไม่ครบตอนแก้ GRN เดิม
            for (const idx of indices) {
              if (idx === primaryIndex) continue;
              form.setValue(`items.${idx}.product_id`, value, {
                shouldDirty: true,
              });
              if (product) {
                form.setValue(`items.${idx}.product_name`, product.name, {
                  shouldDirty: true,
                });
              }
            }
            if (value) onPicked?.();
          }}
          disabled={disabled}
          defaultOpen={defaultOpen}
          className="h-8 w-full text-xs"
          error={fieldState.error?.message}
        />
      )}
    />
  );
});

/** Product cell ของแถวกลุ่ม — manual: lookup; PO/linked: read-only name */
function ProductGroupCell({
  form,
  group,
  disabled,
  autoOpen,
  onPicked,
}: {
  form: UseFormReturn<GrnFormValues>;
  group: GrnGroup;
  disabled: boolean;
  autoOpen: boolean;
  onPicked: () => void;
}) {
  "use no memo";
  const primaryIdx = group.indices[0];
  const productName =
    useWatch({
      control: form.control,
      name: `items.${primaryIdx}.product_name`,
    }) ?? "";

  const productLocalName =
    useWatch({
      control: form.control,
      name: `items.${primaryIdx}.product_local_name`,
    }) ?? "";

  if (group.isManual && !disabled) {
    return (
      <ManualProductCell
        form={form}
        indices={group.indices}
        disabled={disabled}
        defaultOpen={autoOpen}
        onPicked={onPicked}
      />
    );
  }
  return <NameWithSubtext primary={productName} secondary={productLocalName} />;
}

const ProductUnitCell = memo(function ProductUnitCell({
  control,
  index,
}: {
  control: Control<GrnFormValues>;
  index: number;
}) {
  "use no memo";
  const productId = useWatch({ control, name: `items.${index}.product_id` });
  const { data: product } = useProductById(productId || undefined);
  return (
    <span className="text-muted-foreground text-xs">
      {product?.inventory_unit?.name || "—"}
    </span>
  );
});

/** Total (net + tax) รวมของกลุ่ม (sum total_price ทุก location) — คอลัมน์ Amount */
const GroupTotalCell = memo(function GroupTotalCell({
  control,
  indices,
}: {
  control: Control<GrnFormValues>;
  indices: number[];
}) {
  "use no memo";
  const totals = useWatch({
    control,
    name: indices.map((i) => `items.${i}.total_price` as const),
  });
  const total = (totals ?? []).reduce((a, n) => a + (Number(n) || 0), 0);
  return (
    <span className="text-foreground text-xs font-semibold tabular-nums">
      {formatCurrency(total)}
    </span>
  );
});

type GrnQtyField = "approved_qty" | "received_qty" | "foc_qty";
type GrnUnitField = "approved_unit_id" | "received_unit_id" | "foc_unit_id";

/** ยอดรวม qty ของ group (sum ทุก location) + unit — โชว์ที่ product row เหมือน PO */
const GroupQtySum = memo(function GroupQtySum({
  control,
  indices,
  qtyField,
  unitField,
}: {
  control: Control<GrnFormValues>;
  indices: number[];
  qtyField: GrnQtyField;
  unitField: GrnUnitField;
}) {
  "use no memo";
  const qtys = useWatch({
    control,
    name: indices.map((i) => `items.${i}.${qtyField}` as const),
  });
  const total = (qtys ?? []).reduce((a, n) => a + (Number(n) || 0), 0);
  const primary = indices[0];
  const productId =
    useWatch({ control, name: `items.${primary}.product_id` }) ?? "";
  const unitId =
    useWatch({ control, name: `items.${primary}.${unitField}` }) ?? "";
  const { data: units = [] } = useProductUnits(productId || undefined);
  const unitName = units.find((u) => u.id === unitId)?.name ?? "";
  return <InputSuffixPlain value={total} suffix={unitName} />;
});

/**
 * ราคาต่อหน่วยของสินค้า — **กรอกที่แถวสินค้าที่เดียว** แล้วเขียนลงทุกคลังในกลุ่ม
 *
 * ราคาเป็นคุณสมบัติของสินค้าในใบนี้ ไม่ใช่ของคลัง (PO ใบหนึ่งมีราคาเดียว) คลัง
 * ที่รับของคนละที่จึงต้องใช้ราคาเดียวกันเสมอ — แถว location แสดงอย่างเดียว
 * ส่วน payload ยังส่ง `received_price` ราย detail ตามที่ backend ต้องการเหมือนเดิม
 *
 * **ต้องเป็น `Controller` เท่านั้น อย่าเปลี่ยนไปใช้ `useWatch` + `setValue`** —
 * นี่เป็นช่องกรอกช่องเดียวในโปรเจกต์ที่อยู่ใน cell ของ `DataGrid` (ที่อื่น input
 * อยู่ในตารางย่อยซึ่งเป็น JSX ธรรมดา) เคยเขียนเป็น useWatch แล้วโฟกัสหลุดทันที
 * ที่พิมพ์ตัวแรก เพราะ cell ถูกสร้างใหม่แล้ว `InputAmount` ที่ถือ draft/focused
 * เป็น state ภายในโดน remount · Controller คุม subscription ไว้ในตัวเอง cell
 * จึงไม่ถูกกระตุ้นจากข้างนอก (เทสต์ jsdom จับเรื่องนี้ไม่ได้ — vitest ไม่ได้รัน
 * react-compiler ที่ vite.config เปิดไว้)
 *
 * ใช้ `InputAmount` (text input ที่ sanitize เอง) ไม่ใช่ `<input type="number">`:
 * ระหว่างพิมพ์ "17." เบราว์เซอร์อ่าน valueAsNumber เป็น NaN → ยอดต่อบรรทัดแกว่ง
 * และทศนิยมหายกลางคัน
 */
const GroupUnitPrice = memo(function GroupUnitPrice({
  form,
  indices,
  disabled,
  autoFocus,
  onCommit,
}: {
  form: UseFormReturn<GrnFormValues>;
  indices: number[];
  disabled: boolean;
  /** เพิ่งเลือกสินค้าเสร็จ — ให้เคอร์เซอร์มาลงที่ช่องนี้ต่อ */
  autoFocus?: boolean;
  /** กรอกราคาเสร็จ (Enter/Tab) — ไปเปิดตัวเลือกคลังต่อ */
  onCommit?: () => void;
}) {
  "use no memo";
  const primary = indices[0];
  const ref = useRef<HTMLInputElement>(null);

  // autoFocus ของ React ทำงานตอน mount เท่านั้น แต่ cell ตัวนี้ mount ไปแล้ว
  // ตั้งแต่แถวเกิด จังหวะที่ต้องโฟกัสคือตอน "เพิ่งเลือกสินค้า" ซึ่งมาทีหลัง
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  if (disabled) {
    return <GroupUnitPricePlain control={form.control} index={primary} />;
  }

  return (
    <Controller
      control={form.control}
      name={`items.${primary}.unit_price`}
      render={({ field, fieldState }) => (
        <InputAmount
          ref={ref}
          // ไอคอน error อยู่ซ้าย (ตัวเลขชิดขวา) — เว้นที่ให้ด้วย pl-7 ไม่งั้นทับเลข
          className={cn(
            "h-8 w-full text-right text-xs",
            fieldState.error && "pl-7",
          )}
          error={fieldState.error?.message}
          errorIconAlign="left"
          // Enter = กรอกเสร็จแล้ว ไปเลือกคลังต่อ · preventDefault กัน Enter ใน
          // ฟอร์มไปกด submit แทน (ทั้งใบยังกรอกไม่ครบด้วยซ้ำ)
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            onCommit?.();
          }}
          value={Number(field.value ?? 0)}
          onValueChange={(v) => {
            field.onChange(v);
            // คลังที่เหลือตามหัวไปเงียบ ๆ — ไม่ validate ต่อ ให้ Controller ของ
            // แถวหัวเป็นคนเดียวที่คุมจังหวะ validate ตาม mode ของฟอร์ม
            for (const i of indices) {
              if (i === primary) continue;
              form.setValue(`items.${i}.unit_price`, v, { shouldDirty: true });
            }
          }}
        />
      )}
    />
  );
});

/** ราคาของกลุ่มในโหมดอ่าน — ทุกคลังราคาเท่ากัน อ่านจากแถวแรกพอ */
const GroupUnitPricePlain = memo(function GroupUnitPricePlain({
  control,
  index,
}: {
  control: Control<GrnFormValues>;
  index: number;
}) {
  "use no memo";
  const price = useWatch({ control, name: `items.${index}.unit_price` });
  return (
    <span className="text-foreground text-xs font-medium tabular-nums">
      {formatCurrency(Number(price) || 0)}
    </span>
  );
});

type GrnAmountField =
  "net_amount" | "discount_amount" | "tax_amount" | "total_price";

/** ยอดรวมเงินของ group (sum ทุก location, บวกหลาย field ได้) — โชว์ที่ product row เหมือน PO */
const GroupAmountSum = memo(function GroupAmountSum({
  control,
  indices,
  fields,
}: {
  control: Control<GrnFormValues>;
  indices: number[];
  fields: GrnAmountField[];
}) {
  "use no memo";
  const vals = useWatch({
    control,
    name: indices.flatMap((i) => fields.map((f) => `items.${i}.${f}` as const)),
  });
  const total = (vals ?? []).reduce((a, n) => a + (Number(n) || 0), 0);
  return (
    <span className="text-foreground text-xs font-medium tabular-nums">
      {formatCurrency(total)}
    </span>
  );
});

/**
 * เนื้อหา expand ของแถว product — location rows เป็น `<table table-fixed>` ที่ align
 * คอลัมน์กับ group row ผ่าน GRN_COL (mirror po-items-grid-locations)
 *
 * ไม่มีหัวคอลัมน์เป็นของตัวเอง — colgroup ชุดเดียวกับตารางหลัก คอลัมน์จึงตรงกัน
 * อยู่แล้ว หัวอีกชุดคือการอ่านคำเดิมซ้ำห่างกันไม่กี่สิบพิกเซล
 */
function GrnGroupLocations({
  group,
  form,
  itemFields,
  disabled,
  plainText,
  isPo,
  autoOpenLocationKey,
  openLocationKey,
  onLocationOpenChange,
  onDeleteItem,
}: {
  group: GrnGroup;
  form: UseFormReturn<GrnFormValues>;
  itemFields: { id: string }[];
  disabled: boolean;
  plainText: boolean;
  isPo: boolean;
  autoOpenLocationKey: string | null;
  openLocationKey: string | null;
  onLocationOpenChange: (groupKey: string, open: boolean) => void;
  onDeleteItem: (index: number) => void;
}) {
  "use no memo";
  const showActionCol = !disabled;

  // คอลัมน์ align กับ group row — % ของ (data + action ถ้ามี); order นับเฉพาะ isPo
  // ความกว้าง combo (discount/tax) ย่อในโหมดอ่าน ใช้เกณฑ์เดียวกับ showActionCol
  const { col: GRN_COL, dataTotal } = grnItemCols(isPo, showActionCol);
  const denom = dataTotal + (showActionCol ? GRN_COL.action : 0);
  const pct = (px: number) => `${(px / denom) * 100}%`;
  const colCount = 10 + (isPo ? 1 : 0) + (showActionCol ? 1 : 0);

  return (
    <table className="w-full table-fixed border-separate border-spacing-0 text-xs">
      <colgroup>
        <col style={{ width: pct(GRN_COL.product) }} />
        <col style={{ width: pct(GRN_COL.unit) }} />
        {isPo && <col style={{ width: pct(GRN_COL.order) }} />}
        <col style={{ width: pct(GRN_COL.received) }} />
        <col style={{ width: pct(GRN_COL.foc) }} />
        <col style={{ width: pct(GRN_COL.price) }} />
        <col style={{ width: pct(GRN_COL.sub) }} />
        <col style={{ width: pct(GRN_COL.discount) }} />
        <col style={{ width: pct(GRN_COL.net) }} />
        <col style={{ width: pct(GRN_COL.tax) }} />
        <col style={{ width: pct(GRN_COL.amt) }} />
        {showActionCol && <col style={{ width: pct(GRN_COL.action) }} />}
      </colgroup>
      <tbody className="divide-border/60 divide-y">
        {group.indices.length === 0 && (
          <tr>
            <td
              colSpan={colCount}
              className="text-muted-foreground py-3 text-center"
            >
              —
            </td>
          </tr>
        )}
        {group.indices.map((idx) => (
          <GrnLocationRow
            key={itemFields[idx]?.id ?? idx}
            index={idx}
            form={form}
            disabled={disabled}
            isManual={group.isManual}
            isPo={isPo}
            showDelete={showActionCol}
            onDelete={() => onDeleteItem(idx)}
            groupIndices={group.indices}
            plainText={plainText}
            autoOpenLocation={group.key === autoOpenLocationKey}
            locationOpen={
              // เปิดเฉพาะแถวแรกของกลุ่ม — เลือกสินค้าครั้งเดียวไม่ควรเปิดทุกคลัง
              idx === group.indices[0] && group.key === openLocationKey
                ? true
                : undefined
            }
            onLocationOpenChange={(open) =>
              onLocationOpenChange(group.key, open)
            }
          />
        ))}
      </tbody>
    </table>
  );
}

interface UseGrnItemTableOptions {
  form: UseFormReturn<GrnFormValues>;
  groups: GrnGroup[];
  itemFields: { id: string }[];
  disabled: boolean;
  plainText: boolean;
  isPo: boolean;
  autoOpenProductKey: string | null;
  /** กลุ่มที่ต้องโฟกัสช่องราคาอยู่ตอนนี้ (เพิ่งเลือกสินค้าเสร็จ) */
  autoFocusPriceKey: string | null;
  autoOpenLocationKey: string | null;
  /** กลุ่มที่ location lookup ต้องเปิดอยู่ (คุมจากข้างนอก) */
  openLocationKey: string | null;
  onLocationOpenChange: (groupKey: string, open: boolean) => void;
  /** เลือกสินค้าของกลุ่มเสร็จแล้ว — ใช้พา focus ไปช่องถัดไป */
  onProductPicked: (groupKey: string) => void;
  /** กรอกราคาของกลุ่มเสร็จแล้ว — ใช้พา focus ไปช่องถัดไป */
  onPriceCommitted: (groupKey: string) => void;
  onAddLocation: (group: GrnGroup) => void;
  onDeleteGroup: (group: GrnGroup) => void;
  onDeleteItem: (index: number) => void;
}

export function useGrnItemTable({
  form,
  groups,
  itemFields,
  disabled,
  plainText,
  isPo,
  autoOpenProductKey,
  autoFocusPriceKey,
  autoOpenLocationKey,
  openLocationKey,
  onLocationOpenChange,
  onProductPicked,
  onPriceCommitted,
  onAddLocation,
  onDeleteGroup,
  onDeleteItem,
}: UseGrnItemTableOptions) {
  "use no memo";
  const tfl = useTranslations("field");
  const t = useTranslations("procurement.goodsReceiveNote");

  const columns = useMemo<ColumnDef<GrnGroup>[]>(() => {
    const expandColumn: ColumnDef<GrnGroup> = {
      id: "expand",
      header: "",
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={row.getIsExpanded() ? "Collapse" : "Expand"}
          onClick={() => row.toggleExpanded()}
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </Button>
      ),
      enableSorting: false,
      enableResizing: false,
      size: 40,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center",
        // expanded content เริ่มที่ column Product (index 2 = expand, index, product)
        expandedColStart: 2,
        // ปุ่มเพิ่มคลังอยู่ใน gutter ซ้ายนี้ ไม่ใช่ในคอลัมน์ action ของแถวสินค้า —
        // มันสร้างของในตารางย่อย ปุ่มจึงควรอยู่กับตารางย่อย ไม่ใช่ไปปนกับปุ่มลบ
        // ทั้งรายการที่ทำงานคนละระดับกัน · align-top ของ gutter ทำให้ปุ่มอยู่
        // บรรทัดเดียวกับแถวคลังแถวแรกพอดี
        expandedLeading: (row: Row<GrnGroup>) =>
          row.original.isManual && !disabled ? (
            <div className="flex justify-end pt-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-7.5"
                    aria-label={t("addLocation")}
                    onClick={() => onAddLocation(row.original)}
                  >
                    <MapPinPlus aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("addLocation")}</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            // โหมดอ่าน/ใบอิง PO เพิ่มคลังเองไม่ได้ — ที่ว่างตรงนี้เลยใช้บอกว่า
            // ตารางข้าง ๆ คือคลัง ใช้สี/น้ำหนักชุดเดียวกับหัวคอลัมน์ของตาราง
            // (data-grid-table.tsx) มันจึงอ่านเป็นหัวคอลัมน์ ไม่ใช่ข้อมูลลอย
            <div className="text-muted-foreground flex justify-end pt-3 text-xs font-semibold">
              {tfl("location")}
            </div>
          ),
        expandedContent: (group: GrnGroup) => (
          <GrnGroupLocations
            group={group}
            form={form}
            itemFields={itemFields}
            disabled={disabled}
            plainText={plainText}
            isPo={isPo}
            autoOpenLocationKey={autoOpenLocationKey}
            openLocationKey={openLocationKey}
            onLocationOpenChange={onLocationOpenChange}
            onDeleteItem={onDeleteItem}
          />
        ),
      },
    };

    const indexColumn: ColumnDef<GrnGroup> = {
      id: "index",
      header: "#",
      cell: ({ row }) => row.index + 1,
      enableSorting: false,
      enableResizing: false,
      size: 40,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center text-muted-foreground",
      },
    };

    const rightMeta = {
      headerClassName: "text-right",
      cellClassName: "text-right",
    };
    // ยังไม่มีแถวก็ยังไม่มีช่องกรอกให้กว้าง — ใช้ความกว้างโหมดอ่านไปก่อน
    // พอมีรายการแรกค่อยขยาย · ตาราง location ด้านล่างใช้แค่ !disabled ได้
    // เพราะมันจะ render ก็ต่อเมื่อมีรายการอยู่แล้ว สองตารางจึงตรงกันเสมอ
    const { col: GRN_COL } = grnItemCols(
      isPo,
      !disabled && itemFields.length > 0,
    );
    const dataColumns: ColumnDef<GrnGroup>[] = [
      {
        id: "product",
        header: tfl("product"),
        size: GRN_COL.product,
        cell: ({ row }) => (
          <ProductGroupCell
            form={form}
            group={row.original}
            disabled={disabled}
            autoOpen={row.original.key === autoOpenProductKey}
            onPicked={() => onProductPicked(row.original.key)}
          />
        ),
      },
      {
        id: "unit",
        header: tfl("unit"),
        size: GRN_COL.unit,
        cell: ({ row }) => (
          <ProductUnitCell
            control={form.control}
            index={row.original.indices[0]}
          />
        ),
      },
      ...(isPo
        ? [
            {
              id: "order",
              header: tfl("order"),
              size: GRN_COL.order,
              meta: rightMeta,
              cell: ({ row }) => (
                <GroupQtySum
                  control={form.control}
                  indices={row.original.indices}
                  qtyField="approved_qty"
                  unitField="approved_unit_id"
                />
              ),
            } as ColumnDef<GrnGroup>,
          ]
        : []),
      {
        id: "received",
        header: tfl("received"),
        size: GRN_COL.received,
        meta: rightMeta,
        cell: ({ row }) => (
          <GroupQtySum
            control={form.control}
            indices={row.original.indices}
            qtyField="received_qty"
            unitField="received_unit_id"
          />
        ),
      },
      {
        id: "foc",
        header: tfl("foc"),
        size: GRN_COL.foc,
        meta: rightMeta,
        cell: ({ row }) => (
          <GroupQtySum
            control={form.control}
            indices={row.original.indices}
            qtyField="foc_qty"
            unitField="foc_unit_id"
          />
        ),
      },
      {
        id: "price",
        header: tfl("unitPrice"),
        size: GRN_COL.price,
        meta: rightMeta,
        cell: ({ row }) => (
          <GroupUnitPrice
            form={form}
            indices={row.original.indices}
            disabled={disabled}
            autoFocus={row.original.key === autoFocusPriceKey}
            onCommit={() => onPriceCommitted(row.original.key)}
          />
        ),
      },
      {
        id: "subtotal",
        header: tfl("subtotal"),
        size: GRN_COL.sub,
        meta: rightMeta,
        cell: ({ row }) => (
          <GroupAmountSum
            control={form.control}
            indices={row.original.indices}
            fields={["net_amount", "discount_amount"]}
          />
        ),
      },
      {
        id: "discount",
        header: tfl("discount"),
        size: GRN_COL.discount,
        meta: rightMeta,
        cell: ({ row }) => (
          <GroupAmountSum
            control={form.control}
            indices={row.original.indices}
            fields={["discount_amount"]}
          />
        ),
      },
      {
        id: "net",
        header: tfl("net"),
        size: GRN_COL.net,
        meta: rightMeta,
        cell: ({ row }) => (
          <GroupAmountSum
            control={form.control}
            indices={row.original.indices}
            fields={["net_amount"]}
          />
        ),
      },
      {
        id: "tax",
        header: tfl("tax"),
        size: GRN_COL.tax,
        meta: rightMeta,
        cell: ({ row }) => (
          <GroupAmountSum
            control={form.control}
            indices={row.original.indices}
            fields={["tax_amount"]}
          />
        ),
      },
      {
        id: "amount",
        header: tfl("amount"),
        size: GRN_COL.amt,
        meta: rightMeta,
        cell: ({ row }) => (
          <GroupTotalCell
            control={form.control}
            indices={row.original.indices}
          />
        ),
      },
    ];

    const actionColumn: ColumnDef<GrnGroup> = {
      id: "action",
      header: () => "",
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label={t("deleteProductLine")}
                onClick={() => onDeleteGroup(row.original)}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("deleteProductLine")}</TooltipContent>
          </Tooltip>
        </div>
      ),
      enableSorting: false,
      enableResizing: false,
      size: GRN_COL.action,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center",
      },
    };

    const baseCols = [
      expandColumn,
      indexColumn,
      ...dataColumns,
      ...(disabled ? [] : [actionColumn]),
    ];

    return baseCols.map((col) => ({
      ...col,
      meta: {
        ...col.meta,
        // h-11 ตายตัวทั้งแถวหลักและแถวย่อย — ปล่อยให้สูงตามเนื้อหา แถวหลักจะ 39px
        // เพราะชื่อสินค้ากินสองบรรทัด ส่วนแถวย่อยได้ 41px จากช่องกรอก สองแถบเลย
        // ไม่เท่ากันทั้งที่เป็นรายการเดียวกัน · 44px ไม่ใช่ 40 เพราะช่องสินค้ากิน
        // สองบรรทัด (30px) ที่ 40px จะเหลือขอบบน-ล่างแค่ 5px ดูอัดแน่นกว่าแถวย่อย
        // ที่มีบรรทัดเดียว (เหลือ 12px)
        cellClassName: cn("h-11 py-1 align-middle", col.meta?.cellClassName),
      },
    }));
  }, [
    form,
    itemFields,
    disabled,
    plainText,
    isPo,
    autoOpenProductKey,
    autoFocusPriceKey,
    autoOpenLocationKey,
    onAddLocation,
    onPriceCommitted,
    onDeleteGroup,
    onDeleteItem,
    tfl,
    t,
  ]);

  return useReactTable({
    data: groups,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId: (row) => row.key,
  });
}
