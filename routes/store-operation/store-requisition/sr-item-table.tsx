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
import { FieldPlainText } from "@/components/ui/field";
import { InputQty } from "@/components/ui/input/input-qty";
import { LookupLocationPairProduct } from "@/components/lookup/lookup-location-pair-product";
import { InventoryTooltip } from "@/components/ui/inventory-tooltip";
import { OnHandDialog } from "@/components/share/on-hand-dialog";
import { OnOrderDialog } from "@/components/share/on-order-dialog";
import { useBuCode } from "@/hooks/use-bu-code";
import { fieldFocusRef } from "@/lib/field-focus";
import { formatCurrency } from "@/lib/currency-utils";
import { STAGE_ROLE } from "@/types/stage-role";
import type { StoreRequisitionStatus } from "@/types/store-requisition";
import { SR_ITEM_STAGE, type SrFormValues } from "./sr-form-schema";
import { srItemAmount } from "./sr-form-helpers";
import { Badge } from "@/components/ui/badge";
import { SR_ITEM_STATUS_CONFIG } from "@/constant/store-requisition";
import { ItemHistorySheet } from "@/components/share/item-history-sheet";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";

const ProductCell = memo(function ProductCell({
  control,
  form,
  index,
  disabled,
  fromLocationId,
  toLocationId,
}: {
  control: Control<SrFormValues>;
  form: UseFormReturn<SrFormValues>;
  index: number;
  disabled: boolean;
  fromLocationId: string;
  toLocationId: string;
}) {
  "use no memo";
  const buCode = useBuCode();
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const productName =
    useWatch({ control, name: `items.${index}.product_name` }) ?? "";
  const productLocalName =
    useWatch({ control, name: `items.${index}.product_local_name` }) ?? "";
  const unitName =
    useWatch({ control, name: `items.${index}.unit_name` }) ?? "";
  const [onHandOpen, setOnHandOpen] = useState(false);
  const [onOrderOpen, setOnOrderOpen] = useState(false);

  // ยอดคงเหลือ/กำลังสั่ง — hover แล้วยิง API เหมือนหน้า PR (กด label ใน tooltip
  // เปิด dialog รายละเอียดต่อได้) SR ไม่มีคลังรายแถว ยอดจึงอ้างคลังต้นทางของใบ
  const inventory = (
    <>
      <InventoryTooltip
        buCode={buCode}
        locationId={fromLocationId}
        productId={productId}
        unitName={unitName}
        icon="package"
        className={productId ? "text-primary" : "text-muted-foreground"}
        onOnHandClick={productId ? () => setOnHandOpen(true) : undefined}
        onOnOrderClick={productId ? () => setOnOrderOpen(true) : undefined}
      />
      {productId && (
        <>
          <OnHandDialog
            open={onHandOpen}
            onOpenChange={setOnHandOpen}
            productId={productId}
          />
          <OnOrderDialog
            open={onOrderOpen}
            onOpenChange={setOnOrderOpen}
            productId={productId}
          />
        </>
      )}
    </>
  );

  if (disabled) {
    return (
      <div className="flex items-center gap-0.5">
        <div className="min-w-0 flex-1">
          <NameWithSubtext primary={productName} secondary={productLocalName} />
        </div>
        {inventory}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-0.5">
      <div className="min-w-0 flex-1">
        <Controller
          control={control}
          name={`items.${index}.product_id`}
          render={({ field, fieldState }) => (
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
              // ใช้ error ของ RHF ตรง ๆ (กรอบแดง + ไอคอน + tooltip เหมือนทุก lookup
              // ในแอป) — ของเดิมต่อ string เองแล้วลืมเว้นวรรค ได้ class
              // "text-xsring-destructive" ซึ่งไม่มีอยู่จริง กรอบแดงเลยไม่เคยขึ้น
              error={fieldState.error?.message}
              // เลือกสินค้าเสร็จ → เด้งไปช่องจำนวนที่ขอของแถวเดียวกันต่อเลย
              // (SR ไม่มีสถานที่รายแถว มาจากหัวเอกสาร จำนวนจึงเป็นช่องถัดไปจริง ๆ)
              nextFocusRef={fieldFocusRef(`items.${index}.requested_qty`)}
              className="w-full"
            />
          )}
        />
      </div>
      {inventory}
    </div>
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

/** ความกว้างช่องแคบหัวตาราง (checkbox / #) — พอดีตัว checkbox 16px + px-2 สองข้าง */
const SR_NARROW_COL = 28;

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
  const t = useTranslations("storeOperation.storeRequisition");
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
      // checkbox กับ # กว้างเท่ากัน (SR_NARROW_COL) — สองช่องนี้อยู่ติดกันหัวตาราง
      // กว้างไม่เท่ากันเห็นชัดว่าเบี้ยว และไม่ต้องเผื่อที่ให้อะไรมากกว่านี้
      size: SR_NARROW_COL,
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
          return (
            <div data-product-cell-index={row.index}>
              <ProductCell
                control={form.control}
                form={form}
                index={row.index}
                disabled={disabled || lockNonApproved}
                fromLocationId={fromLocationId}
                toLocationId={toLocationId}
              />
            </div>
          );
        },
        // +20 จากเดิม เผื่อที่ปุ่มยอดคงเหลือท้ายเซลล์ ไม่ให้ไปบีบกล่องเลือกสินค้า
        size: 200,
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
            <InputQty
              placeholder={tfl("qty")}
              className="text-right"
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
                  <InputQty
                    placeholder={tfl("qty")}
                    size="xs"
                    className="text-right"
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
                  <InputQty
                    placeholder={tfl("qty")}
                    size="xs"
                    className="text-right"
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
        id: "amount",
        header: tfl("amount"),
        cell: ({ row }) => (
          <FieldPlainText className="justify-end font-semibold tabular-nums">
            {formatCurrency(srItemAmount(row.original))}
          </FieldPlainText>
        ),
        size: 110,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
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
            <ItemHistorySheet
              history={row.original.history ?? []}
              productName={row.original.product_name}
              statusConfig={SR_ITEM_STATUS_CONFIG}
              label={t("tabWorkflowHistory")}
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
      size: SR_NARROW_COL,
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
    t,
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
