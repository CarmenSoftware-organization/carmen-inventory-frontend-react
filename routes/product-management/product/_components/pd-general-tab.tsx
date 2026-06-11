"use no memo";

import { memo, useState } from "react";
import { useTranslations } from "use-intl";
import { Percent, Plus } from "lucide-react";
import { Controller, useFieldArray } from "react-hook-form";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { ProductDetail, ProductFormInstance } from "@/types/product";
import type { ItemGroupDto } from "@/types/category";
import {
  Field,
  FieldError,
  FieldInput,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { LookupUnit } from "@/components/lookup/lookup-unit";
import { LookupItemGroup } from "@/components/lookup/lookup-item-group";
import { LookupTaxProfile } from "@/components/lookup/lookup-tax-profile";
import EmptyComponent from "@/components/empty-component";
import { ProductImages } from "./pd-images";
import { usePdInfoColumns } from "./use-pd-info-columns";

interface GeneralTabProps {
  readonly form: ProductFormInstance;
  readonly isDisabled: boolean;
  readonly product?: ProductDetail;
  readonly onGroupChange?: (
    categoryName: string,
    subCategoryName: string,
  ) => void;
}

function GeneralTab({
  form,
  isDisabled,
  product,
  onGroupChange,
}: GeneralTabProps) {
  const t = useTranslations("productManagement.product");
  const tfl = useTranslations("field");

  const [categoryName, setCategoryName] = useState(
    product?.product_category?.name ?? "",
  );
  const [subCategoryName, setSubCategoryName] = useState(
    product?.product_sub_category?.name ?? "",
  );

  const handleItemGroupChange = (id: string, item?: ItemGroupDto) => {
    form.setValue("product_item_group_id", id, {
      shouldDirty: true,
      shouldValidate: true,
    });
    if (item) {
      form.setValue(
        "price_deviation_limit",
        item.price_deviation_limit ?? null,
      );
      form.setValue("qty_deviation_limit", item.qty_deviation_limit ?? null);
      form.setValue("is_used_in_recipe", item.is_used_in_recipe ?? false);
      form.setValue("is_sold_directly", item.is_sold_directly ?? false);
      if (item.tax_profile_id)
        form.setValue("tax_profile_id", item.tax_profile_id);
      setCategoryName(item.category?.name ?? "");
      setSubCategoryName(item.sub_category?.name ?? "");
      if (item.category)
        onGroupChange?.(item.category.name, item.sub_category?.name ?? "—");
    } else {
      setCategoryName("");
      setSubCategoryName("");
    }
  };

  // Form values used only for readOnly rendering (no reactivity needed when disabled)
  const v = form.getValues();

  // ── Attributes section (merged from former ProductInfoTab) ────────────────
  const {
    fields: infoFields,
    prepend: prependInfo,
    remove: removeInfo,
  } = useFieldArray({
    control: form.control,
    name: "info",
    keyName: "_fieldKey",
  });

  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const confirmDeleteInfo = () => {
    if (deleteIdx !== null) {
      removeInfo(deleteIdx);
      setDeleteIdx(null);
    }
  };
  const addAttribute = () =>
    prependInfo({ label: "", value: "", data_type: "string" });

  const infoColumns = usePdInfoColumns({
    form,
    isDisabled,
    onDelete: setDeleteIdx,
  });

  const infoTable = useReactTable({
    data: infoFields,
    columns: infoColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row._fieldKey,
  });

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        {/* LEFT — Identification + Attributes (stacked) */}
        <div className="flex flex-col gap-4">
          <CardSection title={t("sectionIdentification")}>
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
              <Field data-invalid={!!form.formState.errors.name}>
                <FieldLabel required>{tfl("name")}</FieldLabel>
                {isDisabled ? (
                  <ReadOnlyValue value={v.name} />
                ) : (
                  <FieldInput
                    className="h-9 text-sm"
                    maxLength={100}
                    placeholder={t("namePlaceholder")}
                    error={form.formState.errors.name?.message}
                    {...form.register("name")}
                  />
                )}
              </Field>

              <Field data-invalid={!!form.formState.errors.code}>
                <FieldLabel required>{tfl("code")}</FieldLabel>
                {isDisabled ? (
                  <ReadOnlyValue value={v.code} />
                ) : (
                  <FieldInput
                    className="h-9 text-sm"
                    maxLength={10}
                    placeholder={t("codePlaceholder")}
                    error={form.formState.errors.code?.message}
                    {...form.register("code")}
                  />
                )}
              </Field>

              <Field
                data-invalid={!!form.formState.errors.local_name}
                className="sm:col-span-2"
              >
                <FieldLabel required>{t("localNameLabel")}</FieldLabel>
                {isDisabled ? (
                  <ReadOnlyValue value={v.local_name} />
                ) : (
                  <FieldInput
                    className="h-9 text-sm"
                    style={{
                      fontFamily: '"IBM Plex Sans Thai", var(--font-sans)',
                    }}
                    maxLength={100}
                    placeholder={t("localNamePlaceholder")}
                    error={form.formState.errors.local_name?.message}
                    {...form.register("local_name")}
                  />
                )}
              </Field>

              <Field
                data-invalid={!!form.formState.errors.description}
                className="sm:col-span-2"
              >
                <FieldLabel>{tfl("description")}</FieldLabel>
                {isDisabled ? (
                  <ReadOnlyValue value={v.description} multiline />
                ) : (
                  <>
                    <Textarea
                      rows={3}
                      maxLength={256}
                      aria-invalid={!!form.formState.errors.description}
                      className="resize-none text-sm"
                      style={{
                        fontFamily: '"IBM Plex Sans Thai", var(--font-sans)',
                      }}
                      placeholder={t("descriptionPlaceholder")}
                      {...form.register("description")}
                    />
                    <FieldError>
                      {form.formState.errors.description?.message}
                    </FieldError>
                  </>
                )}
              </Field>

              <Field className="sm:col-span-2">
                <FieldLabel required>{tfl("itemGroup")}</FieldLabel>
                {isDisabled ? (
                  <ReadOnlyValue value={product?.product_item_group?.name} />
                ) : (
                  <Controller
                    control={form.control}
                    name="product_item_group_id"
                    render={({ field }) => (
                      <LookupItemGroup
                        value={field.value}
                        onValueChange={handleItemGroupChange}
                        defaultLabel={product?.product_item_group?.name}
                        placeholder={t("itemGroupPlaceholder")}
                        error={
                          form.formState.errors.product_item_group_id?.message
                        }
                      />
                    )}
                  />
                )}
              </Field>

              <Field>
                <FieldLabel>{tfl("category")}</FieldLabel>
                <ReadOnlyValue value={categoryName} />
              </Field>

              <Field>
                <FieldLabel>{tfl("subCategory")}</FieldLabel>
                <ReadOnlyValue value={subCategoryName} />
              </Field>

              <Field>
                <FieldLabel required>{tfl("inventoryUnit")}</FieldLabel>
                {isDisabled ? (
                  <ReadOnlyValue value={product?.inventory_unit?.name} />
                ) : (
                  <Controller
                    control={form.control}
                    name="inventory_unit_id"
                    render={({ field }) => (
                      <LookupUnit
                        value={field.value}
                        onValueChange={field.onChange}
                        error={form.formState.errors.inventory_unit_id?.message}
                      />
                    )}
                  />
                )}
              </Field>

              <Field>
                <FieldLabel>{tfl("taxProfile")}</FieldLabel>
                {isDisabled ? (
                  <ReadOnlyValue value={product?.tax_profile_name} />
                ) : (
                  <Controller
                    control={form.control}
                    name="tax_profile_id"
                    render={({ field }) => (
                      <LookupTaxProfile
                        value={field.value}
                        onValueChange={field.onChange}
                        className="w-full"
                      />
                    )}
                  />
                )}
              </Field>

              <Field
                data-invalid={!!form.formState.errors.price_deviation_limit}
              >
                <FieldLabel>{t("priceDeviationShort")}</FieldLabel>
                {isDisabled ? (
                  <ReadOnlyValue value={v.price_deviation_limit} suffix="%" />
                ) : (
                  <div className="relative">
                    <FieldInput
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      max="100"
                      placeholder="0"
                      className={`h-9 pr-8 text-right text-sm ${
                        form.formState.errors.price_deviation_limit
                          ? "pl-8"
                          : ""
                      }`}
                      error={
                        form.formState.errors.price_deviation_limit?.message
                      }
                      errorIconAlign="left"
                      {...form.register("price_deviation_limit")}
                    />
                    <Percent
                      aria-hidden="true"
                      className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2"
                    />
                  </div>
                )}
              </Field>

              <Field data-invalid={!!form.formState.errors.qty_deviation_limit}>
                <FieldLabel>{t("qtyDeviationShort")}</FieldLabel>
                {isDisabled ? (
                  <ReadOnlyValue value={v.qty_deviation_limit} suffix="%" />
                ) : (
                  <div className="relative">
                    <FieldInput
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      max="100"
                      placeholder="0"
                      className={`h-9 pr-8 text-right text-sm ${
                        form.formState.errors.qty_deviation_limit ? "pl-8" : ""
                      }`}
                      error={form.formState.errors.qty_deviation_limit?.message}
                      errorIconAlign="left"
                      {...form.register("qty_deviation_limit")}
                    />
                    <Percent
                      aria-hidden="true"
                      className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2"
                    />
                  </div>
                )}
              </Field>
            </div>
          </CardSection>

          {/* Attributes — merged from former Product Info tab */}
          <section className="border-border bg-card rounded-lg border shadow-xs">
            <header className="border-border flex items-center justify-between border-b px-5 py-3">
              <h2 className="text-card-foreground text-sm font-semibold">
                {t("sectionAttributes")}
                <span className="text-muted-foreground ml-1 font-normal">
                  · {infoFields.length}
                </span>
              </h2>
              {!isDisabled && (
                <Button type="button" size="xs" onClick={addAttribute}>
                  <Plus aria-hidden="true" />
                  {t("addAttribute")}
                </Button>
              )}
            </header>

            <div className="p-5">
              {isDisabled ? (
                infoFields.length === 0 ? (
                  <EmptyComponent
                    title={t("noAdditionalInfo")}
                    description={t("addFirstAttributeHint")}
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                    {infoFields.map((field, index) => {
                      const label = form.getValues(`info.${index}.label`);
                      const value = form.getValues(`info.${index}.value`);
                      return (
                        <div
                          key={field._fieldKey}
                          className="flex items-baseline gap-2"
                        >
                          <span className="text-xs font-medium capitalize">
                            {label.replaceAll("_", " ")}:
                          </span>
                          <span className="text-muted-foreground text-sm">
                            {value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : infoFields.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                  <p className="text-sm font-medium">{t("noAdditionalInfo")}</p>
                  <p className="text-muted-foreground text-xs">
                    {t.rich("addFirstAttributeHintRich", {
                      code: (chunks) => (
                        <code className="bg-muted mx-0.5 rounded px-1.5 py-0.5 text-[0.6875rem]">
                          {chunks}
                        </code>
                      ),
                    })}
                  </p>
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={addAttribute}
                  >
                    <Plus aria-hidden="true" />
                    {t("addFirstAttribute")}
                  </Button>
                </div>
              ) : (
                <DataGrid
                  table={infoTable}
                  recordCount={infoFields.length}
                  tableLayout={{ rowRounded: true }}
                  tableClassNames={{
                    bodyRow: "[&>td]:py-3",
                    headerRow: "[&>th]:py-3",
                  }}
                >
                  <DataGridContainer>
                    <ScrollArea className="w-full pb-2">
                      <DataGridTable />
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </DataGridContainer>
                </DataGrid>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT — stacked cards */}
        <div className="flex flex-col gap-4">
          {product && (
            <CardSection title="Images">
              <ProductImages productId={product?.id} readOnly={isDisabled} />
            </CardSection>
          )}
          <CardSection title={t("sectionCodesCost")}>
            <div className="flex flex-col gap-4">
              <Field>
                <FieldLabel>{tfl("sku")}</FieldLabel>
                {isDisabled ? (
                  <ReadOnlyValue value={v.sku} />
                ) : (
                  <Input
                    className="h-9 text-sm"
                    placeholder={t("skuPlaceholder")}
                    {...form.register("sku")}
                  />
                )}
              </Field>

              <Field>
                <FieldLabel>{t("barcodeEan13")}</FieldLabel>
                {isDisabled ? (
                  <ReadOnlyValue value={v.barcode} />
                ) : (
                  <Input
                    className="h-9 text-sm"
                    placeholder={t("barcodePlaceholder")}
                    {...form.register("barcode")}
                  />
                )}
              </Field>

              <Field data-invalid={!!form.formState.errors.price}>
                <FieldLabel>{tfl("price")}</FieldLabel>
                {isDisabled ? (
                  <ReadOnlyValue value={v.price} />
                ) : (
                  <FieldInput
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    className="h-9 pr-3 pl-8 text-right text-sm"
                    error={form.formState.errors.price?.message}
                    errorIconAlign="left"
                    {...form.register("price")}
                  />
                )}
              </Field>
            </div>
          </CardSection>

          <CardSection title={t("sectionFlags")}>
            <div className="flex flex-col gap-3">
              <ToggleRow
                title={tfl("status")}
                desc={t("statusToggleDesc")}
                disabled={isDisabled}
              >
                <Controller
                  control={form.control}
                  name="product_status_type"
                  render={({ field }) => (
                    <Switch
                      checked={field.value === "active"}
                      onCheckedChange={(checked) =>
                        field.onChange(checked ? "active" : "inactive")
                      }
                      disabled={isDisabled}
                      aria-label={tfl("status")}
                    />
                  )}
                />
              </ToggleRow>
              <ToggleRow
                title={t("usedInRecipe")}
                desc={t("usedInRecipeShort")}
                disabled={isDisabled}
              >
                <Controller
                  control={form.control}
                  name="is_used_in_recipe"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isDisabled}
                      aria-label={t("usedInRecipe")}
                    />
                  )}
                />
              </ToggleRow>
              <ToggleRow
                title={t("soldDirectly")}
                desc={t("soldDirectlyShort")}
                disabled={isDisabled}
              >
                <Controller
                  control={form.control}
                  name="is_sold_directly"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isDisabled}
                      aria-label={t("soldDirectly")}
                    />
                  )}
                />
              </ToggleRow>
            </div>
          </CardSection>
        </div>
      </div>

      <DeleteDialog
        open={deleteIdx !== null}
        onOpenChange={(open) => !open && setDeleteIdx(null)}
        title={t("removeInfo")}
        description={t("removeInfoConfirm")}
        onConfirm={confirmDeleteInfo}
      />
    </>
  );
}

export default memo(GeneralTab);

function CardSection({
  title,
  children,
}: Readonly<{
  title: string;
  children: React.ReactNode;
}>) {
  return (
    <section className="border-border bg-card rounded-lg border shadow-xs">
      <header className="border-border border-b px-5 py-3">
        <h2 className="text-card-foreground text-sm font-semibold">{title}</h2>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function ToggleRow({
  title,
  desc,
  disabled,
  children,
}: Readonly<{
  title: string;
  desc: string;
  disabled?: boolean;
  children: React.ReactNode;
}>) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div
          className={`text-sm font-medium ${disabled ? "text-muted-foreground" : ""}`}
        >
          {title}
        </div>
        <div className="text-muted-foreground text-[0.6875rem]">{desc}</div>
      </div>
      {children}
    </div>
  );
}

interface ReadOnlyValueProps {
  readonly value?: string | number | null;
  readonly suffix?: string;
  readonly multiline?: boolean;
}

/**
 * แสดงค่าเป็น plain text สำหรับโหมด readOnly แทนการใช้ input disabled
 *
 * ค่าว่าง ("", null, undefined) แสดงเป็น `—` สีเทา รองรับ `suffix` (เช่น %)
 * และ `multiline` (whitespace-pre-wrap สำหรับ description)
 *
 * @param props - value, suffix, multiline
 * @returns JSX element
 */
function ReadOnlyValue({ value, suffix, multiline }: ReadOnlyValueProps) {
  const isEmpty = value === null || value === undefined || value === "";
  if (isEmpty) {
    return <p className="text-muted-foreground text-sm">—</p>;
  }
  return (
    <p className={`text-sm ${multiline ? "whitespace-pre-wrap" : ""}`}>
      {value}
      {suffix && <span className="text-muted-foreground ml-1">{suffix}</span>}
    </p>
  );
}
