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
import { cn } from "@/lib/utils";
import { LookupProduct } from "@/components/lookup/lookup-product";
import { useProductUnits } from "@/hooks/use-product-units";
import { formatCurrency } from "@/lib/currency-utils";
import type { GrnFormValues } from "./grn-form-schema";
import { GrnItemRow } from "./grn-item-row";

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
}: {
  form: UseFormReturn<GrnFormValues>;
  indices: number[];
  disabled: boolean;
  defaultOpen?: boolean;
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
}: {
  form: UseFormReturn<GrnFormValues>;
  group: GrnGroup;
  disabled: boolean;
  autoOpen: boolean;
}) {
  "use no memo";
  const primaryIdx = group.indices[0];
  const productName =
    useWatch({
      control: form.control,
      name: `items.${primaryIdx}.product_name`,
    }) ?? "";
  const productErr =
    form.formState.errors.items?.[primaryIdx]?.product_id?.message;

  if (group.isManual && !disabled) {
    return (
      <ManualProductCell
        form={form}
        indices={group.indices}
        disabled={disabled}
        defaultOpen={autoOpen}
      />
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span
        className={cn(
          "truncate text-xs font-medium",
          productErr && "text-destructive",
        )}
      >
        {productName || (productErr ? productErr : "—")}
      </span>
    </div>
  );
}

/** Net รวมของกลุ่ม (sum ทุก location) */
const NetTotalCell = memo(function NetTotalCell({
  control,
  indices,
}: {
  control: Control<GrnFormValues>;
  indices: number[];
}) {
  "use no memo";
  const nets = useWatch({
    control,
    name: indices.map((i) => `items.${i}.net_amount` as const),
  });
  const total = (nets ?? []).reduce((a, n) => a + (Number(n) || 0), 0);
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
  return (
    <span className="text-xs">
      <span className="text-foreground font-medium tabular-nums">{total}</span>
      {unitName && (
        <span className="text-muted-foreground ml-1 font-normal">
          {unitName}
        </span>
      )}
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

/** เนื้อหา expand ของแถว product — location rows เดิม (GrnItemRow) + Add Location */
function GrnGroupLocations({
  group,
  form,
  itemFields,
  disabled,
  plainText,
  autoOpenLocationKey,
  onDeleteItem,
}: {
  group: GrnGroup;
  form: UseFormReturn<GrnFormValues>;
  itemFields: { id: string }[];
  disabled: boolean;
  plainText: boolean;
  autoOpenLocationKey: string | null;
  onDeleteItem: (index: number) => void;
}) {
  "use no memo";
  const tfl = useTranslations("field");
  const docType = useWatch({ control: form.control, name: "doc_type" }) ?? "";
  const isPo = docType !== "manual";
  return (
    <div className="w-0 min-w-full overflow-x-auto">
      {/* section header ของ location (เหมือน PO) — จัดคอลัมน์ตรงกับ GrnItemRow */}
      <div className="text-muted-foreground flex items-center gap-2.5 py-1.5 pr-4 pl-3 text-xs font-semibold">
        <span className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1">{tfl("location")}</span>
        {isPo && (
          <span className="w-44 shrink-0 text-right">{tfl("orderAbbr")}</span>
        )}
        <span className="w-44 shrink-0 text-right">
          {tfl("receivedAbbr")}
          <span className="text-destructive"> *</span>
        </span>
        <span className="w-44 shrink-0 text-right">{tfl("foc")}</span>
        <span className="w-20 shrink-0 text-right">{tfl("netAmount")}</span>
        {!disabled && (
          <span className="ml-1 size-6 shrink-0" aria-hidden="true" />
        )}
      </div>
      <div className="divide-y">
        {group.indices.map((idx) => (
          <GrnItemRow
            key={itemFields[idx]?.id ?? idx}
            index={idx}
            form={form}
            disabled={disabled}
            isManual={group.isManual}
            showDelete={!disabled}
            onDelete={() => onDeleteItem(idx)}
            groupIndices={group.indices}
            plainText={plainText}
            autoOpenLocation={group.key === autoOpenLocationKey}
          />
        ))}
      </div>
    </div>
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
            autoOpenLocationKey={autoOpenLocationKey}
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

    const dataColumns: ColumnDef<GrnGroup>[] = [
      {
        id: "product",
        header: tfl("product"),
        size: 320,
        cell: ({ row }) => (
          <ProductGroupCell
            form={form}
            group={row.original}
            disabled={disabled}
            autoOpen={row.original.key === autoOpenProductKey}
          />
        ),
      },
      ...(isPo
        ? [
            {
              id: "order",
              header: tfl("orderAbbr"),
              size: 140,
              meta: {
                headerClassName: "text-right",
                cellClassName: "text-right",
              },
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
        header: tfl("receivedAbbr"),
        size: 140,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
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
        size: 140,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
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
        id: "subtotal",
        header: tfl("subtotalAbbr"),
        size: 120,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
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
        header: tfl("discountAbbr"),
        size: 120,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        cell: ({ row }) => (
          <GroupAmountSum
            control={form.control}
            indices={row.original.indices}
            fields={["discount_amount"]}
          />
        ),
      },
      {
        id: "tax",
        header: tfl("taxAbbr"),
        size: 120,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
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
        header: tfl("netAbbr"),
        size: 140,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        cell: ({ row }) => (
          <NetTotalCell control={form.control} indices={row.original.indices} />
        ),
      },
    ];

    const actionColumn: ColumnDef<GrnGroup> = {
      id: "action",
      header: () => "",
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-0.5">
          {row.original.isManual && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-primary hover:bg-primary/10 hover:text-primary"
              aria-label={t("addLocation")}
              title={t("addLocation")}
              onClick={() => {
                onAddLocation(row.original);
                if (!row.getIsExpanded()) row.toggleExpanded();
              }}
            >
              <MapPinPlus className="size-3.5" aria-hidden="true" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remove"
            onClick={() => onDeleteGroup(row.original)}
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      ),
      enableSorting: false,
      enableResizing: false,
      size: 72,
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
        cellClassName: cn("py-2 align-middle", col.meta?.cellClassName),
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
