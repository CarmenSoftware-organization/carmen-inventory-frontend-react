import { useMemo } from "react";
import {
  Controller,
  useWatch,
  type FieldArrayWithId,
  type UseFormReturn,
} from "react-hook-form";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { FieldInput } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LookupProduct } from "@/components/lookup/lookup-product";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import { cn } from "@/lib/utils";
import type { PriceListTemplate } from "@/types/price-list-template";
import type { ProductLabels } from "./plt-form-labels";
import type { PltFormValues } from "./plt-form-schema";

type DetailField = FieldArrayWithId<PltFormValues, "details", "id">;
type ProductRef = NonNullable<PriceListTemplate["products"]>[number];

interface PltProductTableProps {
  readonly form: UseFormReturn<PltFormValues>;
  readonly detailFields: DetailField[];
  readonly priceListTemplate?: PriceListTemplate;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly onRemove: (idx: number) => void;
  readonly labels: ProductLabels;
}

/**
 * Inline DataGrid table สำหรับ PLT details (flat MOQ tier rows)
 * แต่ละ row คือ 1 detail (1 tier ของสินค้าหนึ่งตัว)
 * รองรับ view (plain text) และ edit (inputs/lookups)
 */
export function PltProductTable({
  form,
  detailFields,
  priceListTemplate,
  isView,
  isDisabled,
  onRemove,
  labels,
}: PltProductTableProps) {
  "use no memo";
  // เก็บ product_id ของทุก row (รวม "") เพื่อ exclude แบบ index-based
  // (กัน duplicate ทั้งของใหม่และของที่ load มาแล้วซ้ำกัน)
  const watchedDetails = useWatch({
    control: form.control,
    name: "details",
  });
  const productIdsByIndex = useMemo(
    () => (watchedDetails ?? []).map((d) => d?.product_id ?? ""),
    [watchedDetails],
  );

  const findProductRef = (rowIndex: number): ProductRef | undefined => {
    const productId = form.getValues(`details.${rowIndex}.product_id`);
    if (!productId) return undefined;
    return priceListTemplate?.products?.find((p) => p.product_id === productId);
  };

  const columns = useMemo<ColumnDef<DetailField>[]>(() => {
    const cols: ColumnDef<DetailField>[] = [
      {
        id: "index",
        size: 60,
        header: () => "#",
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {row.index + 1}
          </span>
        ),
        meta: { headerClassName: "text-center", cellClassName: "text-center" },
      },
      {
        id: "product",
        size: 300,
        header: () => labels.product,
        cell: ({ row }) => (
          <ProductCell
            form={form}
            index={row.index}
            isView={isView}
            isDisabled={isDisabled}
            productRef={findProductRef(row.index)}
            productIdsByIndex={productIdsByIndex}
          />
        ),
      },
      {
        id: "unit",
        size: 160,
        header: () => labels.unit,
        cell: ({ row }) => (
          <UnitCell
            form={form}
            index={row.index}
            isView={isView}
            isDisabled={isDisabled}
          />
        ),
      },
      {
        id: "qty",
        size: 112,
        header: () => labels.qty,
        cell: ({ row }) => (
          <QtyCell
            form={form}
            index={row.index}
            isView={isView}
            isDisabled={isDisabled}
          />
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "note",
        header: () => labels.notePlaceholder,
        size: 260,
        cell: ({ row }) => (
          <NoteCell
            form={form}
            index={row.index}
            isView={isView}
            isDisabled={isDisabled}
            placeholder={labels.notePlaceholder}
          />
        ),
      },
    ];

    if (!isView) {
      cols.push({
        id: "actions",
        size: 60,
        header: () => null,
        cell: ({ row }) =>
          isDisabled ? null : (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label={labels.removeTier}
              onClick={() => onRemove(row.index)}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
            >
              <Trash2 />
            </Button>
          ),
        meta: { headerClassName: "text-center", cellClassName: "text-center" },
      });
    }

    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form,
    isView,
    isDisabled,
    labels,
    onRemove,
    priceListTemplate,
    productIdsByIndex,
  ]);

  const table = useReactTable({
    data: detailFields,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataGrid
      table={table}
      recordCount={detailFields.length}
      tableLayout={{ headerSticky: true }}
    >
      <DataGridContainer>
        <DataGridTable />
      </DataGridContainer>
    </DataGrid>
  );
}

/* ── Cells ─────────────────────────────────────── */

function ProductCell({
  form,
  index,
  isView,
  isDisabled,
  productRef,
  productIdsByIndex,
}: {
  readonly form: UseFormReturn<PltFormValues>;
  readonly index: number;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly productRef?: ProductRef;
  readonly productIdsByIndex: readonly string[];
}) {
  "use no memo";
  const errors = form.formState.errors.details?.[index];
  // exclude product ที่ row อื่นเลือก (filter by index — ไม่ใช่ by id)
  // ทำให้ค่าที่ row นี้ตัวเองเลือกอยู่ ยังเห็นใน dropdown ได้ปกติ
  // และกัน duplicate แม้ data ที่ load มามีซ้ำ
  //
  // multi-tier template มี product_id ซ้ำได้ตามปกติ (getDefaultValues คลี่
  // product.moq เป็นหลาย row ที่ product_id เดียวกัน) ดังนั้นห้าม exclude id ที่
  // เท่ากับค่าที่ row นี้เลือกอยู่ — ไม่งั้น row คู่แฝดจะดัน id นั้นเข้า excludeIds
  // แล้ว LookupProduct resolve label ของตัวเองไม่ได้ (โชว์ placeholder)
  const ownId = productIdsByIndex[index];
  const excludeIds = useMemo(
    () =>
      productIdsByIndex.filter(
        (id, i) => i !== index && id !== "" && id !== ownId,
      ),
    [productIdsByIndex, index, ownId],
  );

  if (isView)
    return (
      <PlainProduct
        name={productRef?.product_name}
        localName={productRef?.product_code}
      />
    );
  return (
    <Controller
      control={form.control}
      name={`details.${index}.product_id`}
      render={({ field }) => (
        <LookupProduct
          value={field.value}
          onValueChange={field.onChange}
          disabled={isDisabled}
          excludeIds={excludeIds}
          className="h-8 w-full text-xs"
          error={errors?.product_id?.message}
        />
      )}
    />
  );
}

function UnitCell({
  form,
  index,
  isView,
  isDisabled,
}: {
  readonly form: UseFormReturn<PltFormValues>;
  readonly index: number;
  readonly isView: boolean;
  readonly isDisabled: boolean;
}) {
  "use no memo";
  const productId =
    useWatch({
      control: form.control,
      name: `details.${index}.product_id`,
    }) ?? "";
  const unitName =
    useWatch({
      control: form.control,
      name: `details.${index}.unit_name`,
    }) ?? "";
  const errors = form.formState.errors.details?.[index];
  if (isView) return <PlainText value={unitName} />;
  return (
    <Controller
      control={form.control}
      name={`details.${index}.unit_id`}
      render={({ field }) => (
        <LookupProductUnit
          productId={productId}
          value={field.value}
          onValueChange={field.onChange}
          onItemChange={(unit) => {
            if (unit?.name) {
              form.setValue(`details.${index}.unit_name`, unit.name);
            }
          }}
          disabled={isDisabled}
          className="w-full text-xs"
          error={errors?.unit_id?.message}
        />
      )}
    />
  );
}

function QtyCell({
  form,
  index,
  isView,
  isDisabled,
}: {
  readonly form: UseFormReturn<PltFormValues>;
  readonly index: number;
  readonly isView: boolean;
  readonly isDisabled: boolean;
}) {
  "use no memo";
  const qty = useWatch({
    control: form.control,
    name: `details.${index}.qty`,
  });
  const errors = form.formState.errors.details?.[index];
  if (isView) return <PlainNumber value={Number(qty) || 0} />;
  return (
    <FieldInput
      type="number"
      inputMode="decimal"
      min={0}
      disabled={isDisabled}
      placeholder="0"
      error={errors?.qty?.message}
      className="border-border/60 h-8 w-full rounded-md text-right text-xs tabular-nums"
      {...form.register(`details.${index}.qty`, { valueAsNumber: true })}
    />
  );
}

function NoteCell({
  form,
  index,
  isView,
  isDisabled,
  placeholder,
}: {
  readonly form: UseFormReturn<PltFormValues>;
  readonly index: number;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly placeholder: string;
}) {
  "use no memo";
  const note = useWatch({
    control: form.control,
    name: `details.${index}.note`,
  });
  if (isView) return <PlainText value={note} />;
  return (
    <Input
      type="text"
      disabled={isDisabled}
      placeholder={placeholder}
      maxLength={256}
      className="border-border/60 h-8 w-full rounded-md text-xs"
      {...form.register(`details.${index}.note`)}
    />
  );
}

/* ── Plain text helpers ─────────────────────── */

function PlainText({ value }: { readonly value?: string | null }) {
  "use no memo";
  if (!value)
    return (
      <span className="text-muted-foreground text-[0.6875rem] italic">—</span>
    );
  return <span className="text-foreground text-xs font-semibold">{value}</span>;
}

function PlainNumber({ value }: { readonly value: number }) {
  "use no memo";
  return (
    <span
      className={cn(
        "text-foreground text-xs font-semibold tabular-nums",
        value === 0 && "text-muted-foreground italic",
      )}
    >
      {value || "—"}
    </span>
  );
}

function PlainProduct({
  name,
  localName,
}: {
  readonly name?: string | null;
  readonly localName?: string | null;
}) {
  "use no memo";
  if (!name)
    return (
      <span className="text-muted-foreground text-[0.6875rem] italic">—</span>
    );
  return (
    <div className="flex flex-col items-baseline gap-1">
      <p className="text-foreground text-xs leading-tight font-semibold">
        {name}
      </p>
      {localName && (
        <p className="text-muted-foreground text-[0.625rem]">({localName})</p>
      )}
    </div>
  );
}
