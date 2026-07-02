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
import { Box, ChevronDown, ChevronRight, MapPinPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LookupProduct } from "@/components/lookup/lookup-product";
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
              form.setValue(`items.${primaryIndex}.product_name`, product.name, {
                shouldDirty: true,
              });
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
    useWatch({ control: form.control, name: `items.${primaryIdx}.product_name` }) ??
    "";
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
      <Box className="text-muted-foreground size-3 shrink-0" />
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
  const total = (nets ?? []).reduce(
    (a, n) => a + (Number(n) || 0),
    0,
  );
  return (
    <span className="text-foreground text-xs font-semibold tabular-nums">
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
  autoOpenLocationKey,
  onDeleteItem,
  leftInsetPct,
}: {
  group: GrnGroup;
  form: UseFormReturn<GrnFormValues>;
  itemFields: { id: string }[];
  disabled: boolean;
  autoOpenLocationKey: string | null;
  onDeleteItem: (index: number) => void;
  /** % ของ table ที่ indent location ให้ตรงขอบ column Product
   *  (ลบ 3.125rem หัก pl-8 + chevron ที่ GrnItemRow มีอยู่แล้วภายใน) */
  leftInsetPct: number;
}) {
  "use no memo";
  return (
    <div
      className="w-0 min-w-full overflow-x-auto"
      style={{ paddingLeft: `calc(${leftInsetPct}% - 3.125rem)` }}
    >
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
  autoOpenProductKey,
  autoOpenLocationKey,
  onAddLocation,
  onDeleteGroup,
  onDeleteItem,
}: UseGrnItemTableOptions) {
  "use no memo";
  const tfl = useTranslations("field");
  const t = useTranslations("procurement.goodsReceiveNote");

  // indent expanded content (location rows) ให้ตรงขอบซ้าย column Product —
  // % ของผลรวม column size (table-fixed w-full → column scale ตามสัดส่วน)
  const showAction = !disabled;
  const totalSize = 36 /* expand */ + 36 /* index */ + 320 /* product */ + 140 /* net */ + (showAction ? 40 : 0);
  const leftInsetPct = ((36 + 36) / totalSize) * 100;

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
      size: 36,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center",
        expandedContent: (group: GrnGroup) => (
          <GrnGroupLocations
            group={group}
            form={form}
            itemFields={itemFields}
            disabled={disabled}
            autoOpenLocationKey={autoOpenLocationKey}
            onDeleteItem={onDeleteItem}
            leftInsetPct={leftInsetPct}
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
      size: 36,
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
      {
        id: "amount",
        header: tfl("netAmount"),
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
    autoOpenProductKey,
    autoOpenLocationKey,
    onAddLocation,
    onDeleteGroup,
    onDeleteItem,
    tfl,
    t,
    leftInsetPct,
  ]);

  return useReactTable({
    data: groups,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId: (row) => row.key,
  });
}
