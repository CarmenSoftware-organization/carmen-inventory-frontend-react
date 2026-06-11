"use no memo";

import {
  Controller,
  useWatch,
  type UseFormReturn,
  type Control,
  type FieldArrayWithId,
} from "react-hook-form";
import {
  type ColumnDef,
  type Row,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { memo, useCallback, useMemo, useState } from "react";
import { useTranslations } from "use-intl";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { LookupLocationPairProduct } from "@/components/lookup/lookup-location-pair-product";
import { STAGE_ROLE } from "@/types/stage-role";
import type { StoreRequisitionStatus } from "@/types/store-requisition";
import type { SrFormValues } from "./sr-form-schema";
import { Badge } from "@/components/ui/badge";
import { SR_STAGE_BADGE_VARIANT } from "@/constant/store-requisition";

const ProductCell = memo(function ProductCell({
  control,
  form,
  index,
  disabled,
  hasError,
  fromLocationId,
  toLocationId,
}: {
  control: Control<SrFormValues>;
  form: UseFormReturn<SrFormValues>;
  index: number;
  disabled: boolean;
  hasError: boolean;
  fromLocationId: string;
  toLocationId: string;
}) {
  const productName =
    useWatch({ control, name: `items.${index}.product_name` }) ?? "";
  if (disabled) {
    return (
      <span className="truncate text-xs font-medium" title={productName}>
        {productName || "—"}
      </span>
    );
  }
  return (
    <Controller
      control={control}
      name={`items.${index}.product_id`}
      render={({ field }) => (
        <LookupLocationPairProduct
          value={field.value ?? ""}
          onValueChange={(value, product) => {
            field.onChange(value);
            if (product) {
              form.setValue(
                `items.${index}.product_name`,
                product.product_name,
              );
              form.setValue(
                `items.${index}.unit_name`,
                product.inventory_unit_name,
              );
            }
          }}
          fromLocationId={fromLocationId}
          toLocationId={toLocationId}
          disabled={disabled}
          className={`h-6 w-full text-xs${hasError ? "ring-destructive rounded-md ring-1" : ""}`}
        />
      )}
    />
  );
});

function SrSelectCell({
  control,
  index,
  row,
}: Readonly<{
  control: Control<SrFormValues>;
  index: number;
  row: Row<SrItemField>;
}>) {
  const stageStatus =
    useWatch({ control, name: `items.${index}.stage_status` }) ?? "";
  const currentStatus =
    useWatch({ control, name: `items.${index}.current_stage_status` }) ?? "";
  const isLocked = isItemLocked(stageStatus, currentStatus);
  if (isLocked) return null;
  const isSelected = row.getIsSelected();
  const canSelect = row.getCanSelect();
  return (
    <>
      {isSelected && (
        <div className="bg-primary absolute inset-s-0 top-0 bottom-0 w-0.5 rounded-full" />
      )}
      <Checkbox
        checked={isSelected}
        disabled={!canSelect}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="align-[inherit]"
      />
    </>
  );
}

const FINAL_STATUSES = new Set<StoreRequisitionStatus>([
  "completed",
  "cancelled",
  "voided",
]);

const isFinalStatus = (status: string) => {
  return FINAL_STATUSES.has(status as StoreRequisitionStatus);
};

const isItemLocked = (stageStatus: string, currentStatus: string) => {
  return isFinalStatus(stageStatus) || isFinalStatus(currentStatus);
};

const StatusCell = memo(function StatusCell({
  control,
  index,
  translate,
}: {
  control: Control<SrFormValues>;
  index: number;
  translate: (value?: string) => string | undefined;
}) {
  const stageStatus =
    useWatch({ control, name: `items.${index}.stage_status` }) ?? "";
  const currentStatus =
    useWatch({ control, name: `items.${index}.current_stage_status` }) ?? "";
  const effective = stageStatus || currentStatus;
  const variant = SR_STAGE_BADGE_VARIANT[effective] ?? "secondary";
  return (
    <Badge variant={variant} className="text-xs uppercase">
      {translate(effective)}
    </Badge>
  );
});

const UnitCell = memo(function UnitCell({
  control,
  index,
}: {
  control: Control<SrFormValues>;
  index: number;
}) {
  const unitName =
    useWatch({ control, name: `items.${index}.unit_name` }) ?? "";
  return <span className="text-muted-foreground text-xs">{unitName}</span>;
});

export type SrItemField = FieldArrayWithId<SrFormValues, "items", "id">;

interface UseSrItemTableOptions {
  form: UseFormReturn<SrFormValues>;
  itemFields: SrItemField[];
  disabled: boolean;
  onDelete: (index: number) => void;
  fromLocationId: string;
  toLocationId: string;
  role?: string;
}

export function useSrItemTable({
  form,
  itemFields,
  disabled,
  onDelete,
  fromLocationId,
  toLocationId,
  role,
}: UseSrItemTableOptions) {
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const [selectDialogOpen, setSelectDialogOpen] = useState(false);

  const allCount = itemFields.length;
  const pendingCount = itemFields.filter((item) => {
    const status = item.current_stage_status ?? "";
    return !status || status === "pending";
  }).length;

  const translateStageStatus = useCallback(
    (value?: string) => {
      const v = value?.trim();
      if (!v || v === "pending") return ts("pending");
      if (v === "submit") return tc("submit");
      if (v === "approve") return tc("approve");
      if (v === "reject") return tc("reject");
      if (v === "review") return tc("review");
      return v;
    },
    [tc, ts],
  );

  const isApproverOnly = role === STAGE_ROLE.APPROVE;
  const isIssuerOnly = role === STAGE_ROLE.ISSUE;
  const isViewOnly = role === STAGE_ROLE.VIEW_ONLY;
  const lockNonApproved = isApproverOnly || isIssuerOnly || isViewOnly;
  const lockNonIssued = isApproverOnly || isViewOnly;
  const lockApproved = isIssuerOnly || isViewOnly;
  const lockIssued = isViewOnly;

  const allColumns = useMemo<ColumnDef<SrItemField>[]>(() => {
    const indexColumn: ColumnDef<SrItemField> = {
      id: "index",
      header: "#",
      cell: ({ row }) => row.index + 1,
      enableSorting: false,
      size: 32,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center text-muted-foreground",
      },
    };

    const dataColumns: ColumnDef<SrItemField>[] = [
      {
        accessorKey: "product_id",
        header: tfl("product"),
        cell: ({ row }) => {
          const hasError =
            !!form.formState.errors.items?.[row.index]?.product_id;
          return (
            <div data-product-cell-index={row.index}>
              <ProductCell
                control={form.control}
                form={form}
                index={row.index}
                disabled={disabled || lockNonApproved}
                hasError={hasError}
                fromLocationId={fromLocationId}
                toLocationId={toLocationId}
              />
            </div>
          );
        },
        size: 180,
      },
      {
        accessorKey: "unit_name",
        header: tfl("unit"),
        cell: ({ row }) => (
          <UnitCell control={form.control} index={row.index} />
        ),
        size: 80,
      },
      {
        accessorKey: "requested_qty",
        header: tfl("requested"),
        cell: ({ row }) => {
          if (disabled || lockNonApproved) {
            return (
              <span className="text-xs tabular-nums">
                {row.original.requested_qty ?? "—"}
              </span>
            );
          }
          const hasError =
            !!form.formState.errors.items?.[row.index]?.requested_qty;
          return (
            <Input
              type="number"
              inputMode="decimal"
              min={1}
              placeholder={tfl("qty")}
              className={`h-6 text-xs md:text-xs text-right${hasError ? "ring-destructive ring-1" : ""}`}
              disabled={disabled}
              {...form.register(`items.${row.index}.requested_qty`, {
                valueAsNumber: true,
              })}
            />
          );
        },
        size: 100,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      ...(role === STAGE_ROLE.CREATE
        ? []
        : ([
            {
              accessorKey: "approved_qty",
              header: tfl("approved"),
              cell: ({ row }) => {
                if (disabled || lockApproved) {
                  return (
                    <span className="text-xs tabular-nums">
                      {row.original.approved_qty ?? "—"}
                    </span>
                  );
                }
                return (
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    placeholder={tfl("qty")}
                    className="h-6 text-right text-xs md:text-xs"
                    disabled={disabled}
                    {...form.register(`items.${row.index}.approved_qty`, {
                      valueAsNumber: true,
                    })}
                  />
                );
              },
              size: 100,
              meta: {
                headerClassName: "text-right",
                cellClassName: "text-right",
              },
            },
          ] satisfies ColumnDef<SrItemField>[])),
      ...(lockNonIssued || role === STAGE_ROLE.CREATE
        ? []
        : ([
            {
              accessorKey: "issued_qty",
              header: tfl("issued"),
              cell: ({ row }) => {
                if (disabled || lockIssued) {
                  return (
                    <span className="text-xs tabular-nums">
                      {row.original.issued_qty ?? "—"}
                    </span>
                  );
                }
                return (
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    placeholder={tfl("qty")}
                    className="h-6 text-right text-xs md:text-xs"
                    disabled={disabled}
                    {...form.register(`items.${row.index}.issued_qty`, {
                      valueAsNumber: true,
                    })}
                  />
                );
              },
              size: 100,
              meta: {
                headerClassName: "text-right",
                cellClassName: "text-right",
              },
            },
          ] satisfies ColumnDef<SrItemField>[])),
      {
        accessorKey: "current_stage_status",
        header: tfl("status"),
        cell: ({ row }) => (
          <StatusCell
            control={form.control}
            index={row.index}
            translate={translateStageStatus}
          />
        ),
        size: 100,
        meta: { headerClassName: "text-center", cellClassName: "text-center" },
      },
    ];

    const actionColumn: ColumnDef<SrItemField> = {
      id: "action",
      header: () => "",
      cell: ({ row }: { row: { index: number } }) => (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label={tc("delete")}
          onClick={() => onDelete(row.index)}
        >
          <Trash2 />
        </Button>
      ),
      enableSorting: false,
      size: 40,
      meta: {
        headerClassName: "text-right",
        cellClassName: "text-right",
      },
    };

    const normalizedRole = (role ?? "").toLowerCase();
    const showSelect =
      !disabled &&
      normalizedRole !== STAGE_ROLE.CREATE &&
      normalizedRole !== STAGE_ROLE.VIEW_ONLY;

    const srSelectColumn: ColumnDef<SrItemField> = {
      id: "select",
      header: ({ table: t }) => {
        const isAllSelected = t.getIsAllPageRowsSelected();
        const isSomeSelected = t.getIsSomePageRowsSelected();
        return (
          <Checkbox
            checked={
              isSomeSelected && !isAllSelected ? "indeterminate" : isAllSelected
            }
            onCheckedChange={(checked) => {
              if (checked) {
                setSelectDialogOpen(true);
              } else {
                t.toggleAllPageRowsSelected(false);
              }
            }}
            aria-label="Select all"
            className="align-[inherit]"
          />
        );
      },
      cell: ({ row }) => (
        <SrSelectCell control={form.control} index={row.index} row={row} />
      ),
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      size: 50,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center",
      },
    };

    return [
      ...(showSelect ? [srSelectColumn] : []),
      indexColumn,
      ...dataColumns,
      ...(disabled || lockNonApproved ? [] : [actionColumn]),
    ];
  }, [
    form,
    disabled,
    lockNonApproved,
    lockApproved,
    lockIssued,
    lockNonIssued,
    onDelete,
    fromLocationId,
    toLocationId,
    role,
    tfl,
    tc,
    translateStageStatus,
  ]);

  const table = useReactTable({
    data: itemFields,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    enableRowSelection: (row) =>
      !isItemLocked(
        row.original.stage_status ?? "",
        row.original.current_stage_status ?? "",
      ),
  });

  const handleSelectAll = () => {
    table.toggleAllPageRowsSelected(true);
    setSelectDialogOpen(false);
  };

  const handleSelectPending = () => {
    const selection: Record<string, boolean> = {};
    for (const field of itemFields) {
      const status = field.current_stage_status ?? "";
      if (!status || status === "pending") {
        selection[field.id] = true;
      }
    }
    table.setRowSelection(selection);
    setSelectDialogOpen(false);
  };

  return {
    table,
    selectDialogOpen,
    setSelectDialogOpen,
    allCount,
    pendingCount,
    handleSelectAll,
    handleSelectPending,
  };
}
