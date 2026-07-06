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
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldInput, FieldPlainText } from "@/components/ui/field";
import { LookupLocationPairProduct } from "@/components/lookup/lookup-location-pair-product";
import { STAGE_ROLE } from "@/types/stage-role";
import type { StoreRequisitionStatus } from "@/types/store-requisition";
import { SR_ITEM_STAGE, type SrFormValues } from "./sr-form-schema";
import { Badge } from "@/components/ui/badge";
import { SR_ITEM_STATUS_CONFIG } from "@/constant/store-requisition";
import { SrItemHistorySheet } from "./sr-item-history";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";

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
  "use no memo";
  const productName =
    useWatch({ control, name: `items.${index}.product_name` }) ?? "";
  const productLocalName =
    useWatch({ control, name: `items.${index}.product_local_name` }) ?? "";
  if (disabled) {
    return (
      <NameWithSubtext primary={productName} secondary={productLocalName} />
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
  "use no memo";
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
  form,
  index,
  translate,
  role,
}: {
  control: Control<SrFormValues>;
  form?: UseFormReturn<SrFormValues>;
  index: number;
  translate: (value?: string) => string | undefined;
  role?: string;
}) {
  "use no memo";
  const stageStatus =
    useWatch({ control, name: `items.${index}.stage_status` }) ?? "";
  const currentStatus =
    useWatch({ control, name: `items.${index}.current_stage_status` }) ?? "";
  const initialStatus =
    useWatch({ control, name: `items.${index}._initial_stage_status` }) ?? "";
  const effective = stageStatus || currentStatus;
  const config =
    SR_ITEM_STATUS_CONFIG[effective] ?? SR_ITEM_STATUS_CONFIG.pending;

  // approver/issuer แก้สถานะได้; แต่ล็อกถ้า server ส่งมาแล้วเป็น approve/reject
  const canEdit =
    !!form && (role === STAGE_ROLE.APPROVE || role === STAGE_ROLE.ISSUE);
  const isLockedFromServer =
    initialStatus === SR_ITEM_STAGE.APPROVE ||
    initialStatus === SR_ITEM_STAGE.REJECT;
  const showReset =
    canEdit &&
    !isLockedFromServer &&
    (effective === SR_ITEM_STAGE.APPROVE ||
      effective === SR_ITEM_STAGE.REJECT ||
      effective === SR_ITEM_STAGE.REVIEW);

  const handleReset = () => {
    form?.setValue(`items.${index}.stage_status`, SR_ITEM_STAGE.PENDING);
    form?.setValue(
      `items.${index}.current_stage_status`,
      SR_ITEM_STAGE.PENDING,
    );
  };

  return (
    <Badge
      className={`${config.className} inline-flex items-center gap-1`}
      size="xs"
    >
      {translate(effective)}
      {showReset && (
        <button
          type="button"
          aria-label="Reset status"
          className="rounded-full opacity-60 hover:opacity-100 focus-visible:outline-none"
          onClick={handleReset}
        >
          <X className="size-2.5" />
        </button>
      )}
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
  "use no memo";
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
  "use no memo";
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
              <FieldPlainText className="justify-end tabular-nums">
                {row.original.requested_qty == null
                  ? ""
                  : row.original.requested_qty}
              </FieldPlainText>
            );
          }
          const qtyError =
            form.formState.errors.items?.[row.index]?.requested_qty?.message;
          return (
            <FieldInput
              type="number"
              inputMode="decimal"
              min={1}
              placeholder={tfl("qty")}
              className="h-6 text-right text-xs md:text-xs"
              disabled={disabled}
              error={qtyError}
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
                    <FieldPlainText className="justify-end tabular-nums">
                      {row.original.approved_qty == null
                        ? ""
                        : row.original.approved_qty}
                    </FieldPlainText>
                  );
                }
                return (
                  <FieldInput
                    type="number"
                    inputMode="decimal"
                    min={0}
                    placeholder={tfl("qty")}
                    className="h-6 text-right text-xs md:text-xs"
                    disabled={disabled}
                    error={
                      form.formState.errors.items?.[row.index]?.approved_qty
                        ?.message
                    }
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
                    <FieldPlainText className="justify-end tabular-nums">
                      {row.original.issued_qty == null
                        ? ""
                        : row.original.issued_qty}
                    </FieldPlainText>
                  );
                }
                return (
                  <FieldInput
                    type="number"
                    inputMode="decimal"
                    min={0}
                    placeholder={tfl("qty")}
                    className="h-6 text-right text-xs md:text-xs"
                    disabled={disabled}
                    error={
                      form.formState.errors.items?.[row.index]?.issued_qty
                        ?.message
                    }
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
            form={form}
            index={row.index}
            translate={translateStageStatus}
            role={role}
          />
        ),
        size: 100,
        meta: { headerClassName: "text-center", cellClassName: "text-center" },
      },
    ];

    const canDelete = !(disabled || lockNonApproved);
    const actionColumn: ColumnDef<SrItemField> = {
      id: "action",
      header: () => "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end">
          {(row.original.history?.length ?? 0) > 0 && (
            <SrItemHistorySheet
              history={row.original.history ?? []}
              productName={row.original.product_name}
            />
          )}
          {canDelete && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              aria-label={tc("delete")}
              onClick={() => onDelete(row.index)}
            >
              <Trash2 />
            </Button>
          )}
        </div>
      ),
      enableSorting: false,
      size: 64,
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

    // แสดงคอลัมน์ action เมื่อแก้ไขได้ หรือมีรายการใดมีประวัติ workflow (ปุ่ม history)
    const hasAnyHistory = itemFields.some(
      (item) => (item.history?.length ?? 0) > 0,
    );

    return [
      ...(showSelect ? [srSelectColumn] : []),
      indexColumn,
      ...dataColumns,
      ...(canDelete || hasAnyHistory ? [actionColumn] : []),
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
    itemFields,
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
