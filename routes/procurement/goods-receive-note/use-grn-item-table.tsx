import { memo, useMemo } from "react";
import {
  Controller,
  useWatch,
  type Control,
  type UseFormReturn,
} from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  type ColumnDef,
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

/**
 * หน่วยนับของสินค้า (inventory unit จาก product master) — โชว์อย่างเดียว
 *
 * ไม่ใช่หน่วยที่รับ (`received_unit_id` ซึ่งเลือกได้ต่อ location) แต่เป็นหน่วยที่
 * สินค้าตัวนี้ถือสต๊อกอยู่ ใช้เทียบตาว่าหน่วยที่กำลังรับเป็นคนละตัวกับหน่วยสต๊อกไหม
 * · API ของ GRN ไม่ได้ส่งมาด้วย จึงอ่านจาก product master (แคช 5 นาที ต่อ 1 สินค้า)
 */
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
 * ราคาต่อหน่วยของ product row — ราคาอยู่ระดับ location จึงถัวเฉลี่ยตามจำนวนที่รับ
 * (ยอดก่อนส่วนลดรวม ÷ จำนวนรับรวม) ไม่ใช่เฉลี่ยเปล่า ๆ ไม่งั้นแถวที่รับ 1 หน่วย
 * จะถ่วงเท่าแถวที่รับ 100 · ยังไม่ได้กรอกจำนวน = ยังเฉลี่ยไม่ได้ → โชว์ราคาเดียว
 * ที่มี (ทุกแถวราคาเท่ากันอยู่แล้วในกรณีปกติ), ไม่มีอะไรเลย = 0.00
 */
const GroupUnitPrice = memo(function GroupUnitPrice({
  control,
  indices,
}: {
  control: Control<GrnFormValues>;
  indices: number[];
}) {
  "use no memo";
  const prices = useWatch({
    control,
    name: indices.map((i) => `items.${i}.unit_price` as const),
  });
  const qtys = useWatch({
    control,
    name: indices.map((i) => `items.${i}.received_qty` as const),
  });
  const priceList = (prices ?? []).map((p) => Number(p) || 0);
  const qtyList = (qtys ?? []).map((q) => Number(q) || 0);
  const totalQty = qtyList.reduce((a, n) => a + n, 0);
  const avg =
    totalQty > 0
      ? priceList.reduce((a, p, i) => a + p * (qtyList[i] ?? 0), 0) / totalQty
      : (priceList.find((p) => p > 0) ?? 0);
  return (
    <span className="text-foreground text-xs font-medium tabular-nums">
      {formatCurrency(avg)}
    </span>
  );
});

type GrnAmountField =
  | "net_amount"
  | "discount_amount"
  | "tax_amount"
  | "total_price";

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
 * คอลัมน์กับ group row ผ่าน GRN_COL (mirror po-items-grid-locations) พร้อม thead labels
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
  const tfl = useTranslations("field");
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
      <thead className="text-muted-foreground text-xs font-semibold">
        {/* ตารางย่อยใช้ colgroup ชุดเดียวกับตารางหลัก คอลัมน์จึงตรงกันอยู่แล้ว
            หัวคอลัมน์ซ้ำอีกชุดเลยเป็นการอ่านคำเดิมสองรอบห่างกันไม่กี่สิบพิกเซล
            เหลือไว้แค่ "ที่เก็บ" ซึ่งเป็นคำเดียวที่ตารางหลักไม่มี */}
        <tr className="border-border/60 h-11 border-b">
          <th className="px-3 py-1 text-left">{tfl("location")}</th>
          <th className="px-3 py-1" />
          {isPo && <th className="px-3 py-1" />}
          <th className="px-3 py-1" />
          <th className="px-3 py-1" />
          <th className="px-3 py-1" />
          <th className="px-3 py-1" />
          <th className="px-3 py-1" />
          <th className="px-3 py-1" />
          <th className="px-3 py-1" />
          <th className="px-3 py-1" />
          {showActionCol && <th className="px-3 py-1" />}
        </tr>
      </thead>
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
  autoOpenLocationKey: string | null;
  /** กลุ่มที่ location lookup ต้องเปิดอยู่ (คุมจากข้างนอก) */
  openLocationKey: string | null;
  onLocationOpenChange: (groupKey: string, open: boolean) => void;
  /** เลือกสินค้าของกลุ่มเสร็จแล้ว — ใช้พา focus ไปช่องถัดไป */
  onProductPicked: (groupKey: string) => void;
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
  autoOpenLocationKey,
  openLocationKey,
  onLocationOpenChange,
  onProductPicked,
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
            control={form.control}
            indices={row.original.indices}
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
        // ปุ่มไอคอนล้วนสองตัวติดกัน เดาจากรูปอย่างเดียวไม่ออกว่าอันไหนลบอะไร
        // (ลบสินค้าทั้งบรรทัด vs ลบเฉพาะที่เก็บในแถวย่อย) — บอกด้วย tooltip
        <div className="flex items-center justify-center gap-0.5">
          {row.original.isManual && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-primary hover:bg-primary/10 hover:text-primary"
                  aria-label={t("addLocation")}
                  onClick={() => {
                    onAddLocation(row.original);
                    if (!row.getIsExpanded()) row.toggleExpanded();
                  }}
                >
                  <MapPinPlus className="size-3.5" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("addLocation")}</TooltipContent>
            </Tooltip>
          )}
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
    autoOpenLocationKey,
    onAddLocation,
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
