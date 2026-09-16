import { useMemo } from "react";
import { useTranslations } from "use-intl";
import { X } from "lucide-react";
import { Controller, type FieldArrayWithId } from "react-hook-form";
import type { ColumnDef } from "@tanstack/react-table";
import { FieldInput, FieldSelect } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { ProductFormInstance, ProductFormValues } from "@/types/product";
import { PRODUCT_ATTRIBUTE_LABELS } from "@/types/product";

export type InfoField = FieldArrayWithId<
  ProductFormValues,
  "info",
  "_fieldKey"
>;

interface UsePdInfoColumnsOptions {
  readonly form: ProductFormInstance;
  readonly isDisabled: boolean;
  readonly onDelete: (index: number) => void;
}

export function usePdInfoColumns({
  form,
  isDisabled,
  onDelete,
}: UsePdInfoColumnsOptions): ColumnDef<InfoField>[] {
  "use no memo";
  const t = useTranslations("productManagement.product");
  const tfl = useTranslations("field");

  return useMemo<ColumnDef<InfoField>[]>(() => {
    const indexCol: ColumnDef<InfoField> = {
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

    const dataCols: ColumnDef<InfoField>[] = [
      {
        accessorKey: "label",
        header: tfl("name"),
        size: 180,
        cell: ({ row }) => {
          const errorMessage =
            form.formState.errors.info?.[row.index]?.label?.message;
          return (
            <Controller
              control={form.control}
              name={`info.${row.index}.label`}
              render={({ field: labelField }) => (
                <FieldSelect
                  value={labelField.value || "custom"}
                  onValueChange={(value) =>
                    labelField.onChange(value === "custom" ? "" : value)
                  }
                  disabled={isDisabled}
                  size="sm"
                  className="h-8 text-xs"
                  placeholder={t("selectLabel")}
                  error={errorMessage}
                >
                  <SelectContent>
                    {PRODUCT_ATTRIBUTE_LABELS.map((lbl) => (
                      <SelectItem key={lbl} value={lbl}>
                        {lbl.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">{t("customLabel")}</SelectItem>
                  </SelectContent>
                </FieldSelect>
              )}
            />
          );
        },
      },
      {
        accessorKey: "value",
        header: tfl("description"),
        size: 200,
        cell: ({ row }) => {
          const errorMessage =
            form.formState.errors.info?.[row.index]?.value?.message;
          return (
            <FieldInput
              placeholder={tfl("description")}
              className="h-8 text-xs md:text-xs"
              disabled={isDisabled}
              error={errorMessage}
              {...form.register(`info.${row.index}.value`)}
            />
          );
        },
      },
      {
        accessorKey: "data_type",
        header: tfl("type"),
        size: 100,
        cell: ({ row }) => (
          <Controller
            control={form.control}
            name={`info.${row.index}.data_type`}
            render={({ field: dtField }) => (
              <Select
                value={dtField.value}
                onValueChange={dtField.onChange}
                disabled={isDisabled}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">{t("stringType")}</SelectItem>
                  <SelectItem value="number">{t("numberType")}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        ),
      },
    ];

    const actionCol: ColumnDef<InfoField> = {
      id: "action",
      header: () => "",
      enableSorting: false,
      size: 40,
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label="Remove"
          onClick={() => onDelete(row.index)}
        >
          <X />
        </Button>
      ),
      meta: { headerClassName: "text-right", cellClassName: "text-right" },
    };

    return [indexCol, ...dataCols, ...(isDisabled ? [] : [actionCol])];
  }, [form, isDisabled, onDelete, t, tfl]);
}
