import { useState, useMemo } from "react";
import {
  useFieldArray,
  useWatch,
  Controller,
  type UseFormReturn,
  type FieldArrayWithId,
} from "react-hook-form";
import { useTranslations } from "use-intl";
import { DollarSign, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputSuffixAddon,
  InputSuffixField,
  InputSuffixInput,
} from "@/components/ui/input/input-suffix";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { LookupExtraCost } from "@/components/lookup/lookup-extra-cost";
import EmptyComponent from "@/components/empty-component";
import type { GrnFormValues } from "./grn-form-schema";
import { EMPTY_EXTRA_COST } from "./grn-form-schema";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

type ExtraCostField = FieldArrayWithId<
  GrnFormValues,
  "extra_cost_details",
  "id"
>;

interface GrnExtraCostFieldsProps {
  readonly form: UseFormReturn<GrnFormValues>;
  readonly disabled: boolean;
}

export function GrnExtraCostFields({
  form,
  disabled,
}: GrnExtraCostFieldsProps) {
  "use no memo";
  const t = useTranslations("procurement.goodsReceiveNote");
  const tfl = useTranslations("field");

  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // currency code (doc-level) สำหรับต่อท้ายช่องจำนวนเงิน
  const currencyCode =
    useWatch({ control: form.control, name: "currency_name" }) ?? "";

  const {
    fields: costFields,
    prepend: prependCost,
    remove: removeCost,
  } = useFieldArray({ control: form.control, name: "extra_cost_details" });

  const columns = useMemo<ColumnDef<ExtraCostField>[]>(() => {
    const indexCol: ColumnDef<ExtraCostField> = {
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

    const dataCols: ColumnDef<ExtraCostField>[] = [
      {
        accessorKey: "extra_cost_type_id",
        header: tfl("type"),
        cell: ({ row }) => (
          <Controller
            control={form.control}
            name={`extra_cost_details.${row.index}.extra_cost_type_id`}
            render={({ field }) => (
              <LookupExtraCost
                value={field.value}
                onValueChange={field.onChange}
                disabled={disabled}
                size="xs"
                className="w-full text-xs"
              />
            )}
          />
        ),
        size: 200,
      },
      {
        accessorKey: "amount",
        header: tfl("amount"),
        cell: ({ row }) => (
          <InputSuffixField className="h-6 w-full" disabled={disabled}>
            <InputSuffixInput
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              {...form.register(`extra_cost_details.${row.index}.amount`, {
                valueAsNumber: true,
              })}
            />
            {currencyCode && (
              <InputSuffixAddon>
                <span className="text-muted-foreground px-1.5 text-xs">
                  {currencyCode}
                </span>
              </InputSuffixAddon>
            )}
          </InputSuffixField>
        ),
        size: 120,
        meta: { headerClassName: "text-right" },
      },
      {
        accessorKey: "note",
        header: tfl("note"),
        cell: ({ row }) => (
          <Input
            className="h-6 text-xs"
            disabled={disabled}
            maxLength={256}
            {...form.register(`extra_cost_details.${row.index}.note`)}
          />
        ),
        size: 200,
      },
    ];

    const actionCol: ColumnDef<ExtraCostField> = {
      id: "action",
      header: () => "",
      cell: ({ row }: { row: { index: number } }) => (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label="Remove"
          onClick={() => setDeleteIndex(row.index)}
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

    return [indexCol, ...dataCols, ...(disabled ? [] : [actionCol])];
  }, [form, disabled, tfl, currencyCode]);

  const table = useReactTable({
    data: costFields,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div className="space-y-4 pt-4">
      {/* Extra Cost Header */}
      <div className="max-w-xs">
        <Field>
          <FieldLabel className="text-xs">{tfl("type")}</FieldLabel>
          <Controller
            control={form.control}
            name="allocate_extra_cost_type"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={disabled}
              >
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { value: "by_qty", label: t("byQuantity") },
                    { value: "by_value", label: t("byValue") },
                  ].map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-xs"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

      {/* Extra Cost Details Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-sm font-semibold tracking-tight">
            {t("extraCostDetails")}
          </h2>
          {!disabled && (
            <Button
              type="button"
              size="xs"
              onClick={() => prependCost({ ...EMPTY_EXTRA_COST })}
            >
              <Plus /> {t("addCost")}
            </Button>
          )}
        </div>

        <DataGrid
          table={table}
          recordCount={costFields.length}
          emptyMessage={
            <EmptyComponent
              icon={DollarSign}
              title={t("noExtraCosts")}
              description={t("noExtraCostsDesc")}
              content={
                !disabled && (
                  <Button
                    type="button"
                    size="xs"
                    onClick={() => prependCost({ ...EMPTY_EXTRA_COST })}
                  >
                    <Plus /> {t("addCost")}
                  </Button>
                )
              }
            />
          }
        >
          <DataGridContainer>
            <ScrollArea className="w-full pb-2">
              <DataGridTable />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </DataGridContainer>
        </DataGrid>
      </div>

      <DeleteDialog
        open={deleteIndex !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteIndex(null);
        }}
        title={t("removeExtraCost")}
        description={t("removeExtraCostConfirm")}
        onConfirm={() => {
          if (deleteIndex === null) return;
          removeCost(deleteIndex);
          setDeleteIndex(null);
        }}
      />
    </div>
  );
}
