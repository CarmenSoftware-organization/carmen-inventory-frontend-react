import { memo, useState } from "react";
import { useTranslations } from "use-intl";
import { Percent, Plus } from "lucide-react";
import {
  Controller,
  useFieldArray,
  useFormState,
  useWatch,
} from "react-hook-form";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { ProductDetail, ProductFormInstance } from "@/types/product";
import type {
  ItemGroupDto,
  CategoryDto,
  SubCategoryDto,
} from "@/types/category";
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
import { SettingSection } from "@/components/ui/setting-section";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { LookupUnit } from "@/components/lookup/lookup-unit";
import { LookupCategory } from "@/components/lookup/lookup-category";
import { LookupSubCategory } from "@/components/lookup/lookup-sub-category";
import { LookupItemGroup } from "@/components/lookup/lookup-item-group";
import { LookupTaxProfile } from "@/components/lookup/lookup-tax-profile";
import EmptyComponent from "@/components/empty-component";
import { ProductImages } from "./pd-images";
import { usePdInfoColumns } from "./use-pd-info-columns";

interface PdTabGeneralProps {
  readonly form: ProductFormInstance;
  readonly isDisabled: boolean;
  readonly product?: ProductDetail;
  readonly onGroupChange?: (
    categoryName: string,
    subCategoryName: string,
  ) => void;
  /** รูปที่เลือกไว้แต่ยังไม่อัปโหลด — ฟอร์มเป็นคนถือ ส่งขึ้นตอนกด Save */
  readonly pendingImages?: readonly File[];
  readonly onPendingImagesChange?: (files: File[]) => void;
}

function PdTabGeneral({
  form,
  isDisabled,
  product,
  onGroupChange,
  pendingImages,
  onPendingImagesChange,
}: PdTabGeneralProps) {
  "use no memo";
  // อ่าน error ผ่าน useFormState ไม่ใช่ form.formState — component นี้ห่อ memo()
  // และ props (form/isDisabled) เป็น ref นิ่ง กด save แล้ว validation fail ตัว
  // parent re-render แต่ตัวนี้ถูก memo กั้นไว้ กรอบแดงเลยไม่ขึ้นจนกว่าจะสลับแท็บ
  // ไปกลับ (remount แล้วอ่านใหม่) · useFormState subscribe ที่ component นี้เอง
  const { errors } = useFormState({ control: form.control });
  const t = useTranslations("productManagement.product");
  const tfl = useTranslations("field");

  const [categoryName, setCategoryName] = useState(
    product?.product_category?.name ?? "",
  );
  const [subCategoryName, setSubCategoryName] = useState(
    product?.product_sub_category?.name ?? "",
  );

  const isAdd = !product;

  // id ของ category/sub-category อยู่ในฟอร์ม (ไม่ใช่ useState) เพื่อให้ zod
  // ตรวจได้เหมือนช่องอื่น · ส่วน "ชื่อ" ยังเป็น state เพราะใช้แค่โชว์ตอน view
  const [categoryId, subCategoryId] = useWatch({
    control: form.control,
    name: ["product_category_id", "product_sub_category_id"],
  });

  const setField = (
    name:
      | "product_category_id"
      | "product_sub_category_id"
      | "product_item_group_id",
    value: string,
  ) => {
    form.setValue(name, value, { shouldDirty: true, shouldValidate: true });
  };

  const handleCategoryChange = (id: string, item?: CategoryDto) => {
    setField("product_category_id", id);
    setCategoryName(item?.name ?? "");
    // เปลี่ยนหมวดแล้วหมวดย่อย/กลุ่มเดิมไม่เกี่ยวกันอีกต่อไป ล้างทิ้ง
    setField("product_sub_category_id", "");
    setSubCategoryName("");
    setField("product_item_group_id", "");
  };

  const handleSubCategoryChange = (id: string, item?: SubCategoryDto) => {
    setField("product_sub_category_id", id);
    setSubCategoryName(item?.name ?? "");
    setField("product_item_group_id", "");
  };

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
      // เลือกกลุ่มสินค้าตรง ๆ (โหมดแก้ไข) ก็ต้องเติม id หมวดตามไปด้วย ไม่งั้น
      // ช่องหมวดว่างแล้ว validate ไม่ผ่านทั้งที่ผู้ใช้เลือกครบแล้ว
      if (item.category?.id) setField("product_category_id", item.category.id);
      if (item.sub_category?.id)
        setField("product_sub_category_id", item.sub_category.id);
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
      {/* Identification */}
      <SettingSection
        first
        title={t("sectionIdentification")}
        description={t("sectionIdentificationDesc")}
      >
        <Field data-invalid={!!errors.name}>
          <FieldLabel required>{tfl("name")}</FieldLabel>
          {isDisabled ? (
            <ReadOnlyValue value={v.name} />
          ) : (
            <FieldInput
              className="h-9 text-sm"
              maxLength={100}
              placeholder={t("namePlaceholder")}
              error={errors.name?.message}
              {...form.register("name")}
            />
          )}
        </Field>

        <Field>
          <FieldLabel>{tfl("code")}</FieldLabel>
          {isAdd ? (
            <FieldInput
              className="h-9 text-sm"
              disabled
              placeholder={tfl("autoGenerated")}
            />
          ) : (
            <ReadOnlyValue value={v.code} />
          )}
        </Field>

        <Field data-invalid={!!errors.local_name} className="sm:col-span-2">
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
              error={errors.local_name?.message}
              {...form.register("local_name")}
            />
          )}
        </Field>

        <Field data-invalid={!!errors.description} className="sm:col-span-2">
          <FieldLabel>{tfl("description")}</FieldLabel>
          {isDisabled ? (
            <ReadOnlyValue value={v.description} multiline />
          ) : (
            <>
              <Textarea
                rows={3}
                maxLength={256}
                aria-invalid={!!errors.description}
                className="resize-none"
                style={{
                  fontFamily: '"IBM Plex Sans Thai", var(--font-sans)',
                }}
                placeholder={t("descriptionPlaceholder")}
                {...form.register("description")}
              />
              <FieldError>{errors.description?.message}</FieldError>
            </>
          )}
        </Field>
      </SettingSection>

      {/* Classification */}
      <SettingSection
        title={t("sectionClassification")}
        description={t("sectionClassificationDesc")}
      >
        <Field data-invalid={!!errors.product_category_id}>
          <FieldLabel required>{tfl("category")}</FieldLabel>
          {isDisabled ? (
            <ReadOnlyValue value={categoryName} />
          ) : (
            <LookupCategory
              value={categoryId}
              onValueChange={handleCategoryChange}
              defaultLabel={product?.product_category?.name}
              className="w-full"
              error={errors.product_category_id?.message}
            />
          )}
        </Field>

        <Field data-invalid={!!errors.product_sub_category_id}>
          <FieldLabel required>{tfl("subCategory")}</FieldLabel>
          {isDisabled ? (
            <ReadOnlyValue value={subCategoryName} />
          ) : (
            <LookupSubCategory
              value={subCategoryId}
              onValueChange={handleSubCategoryChange}
              filterCategoryId={categoryId}
              disabled={!categoryId}
              defaultLabel={product?.product_sub_category?.name}
              className="w-full"
              error={errors.product_sub_category_id?.message}
            />
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
                  filterSubCategoryId={subCategoryId}
                  disabled={!subCategoryId && !field.value}
                  defaultLabel={product?.product_item_group?.name}
                  placeholder={t("itemGroupPlaceholder")}
                  error={errors.product_item_group_id?.message}
                />
              )}
            />
          )}
        </Field>
      </SettingSection>

      {/* Unit & Tax */}
      <SettingSection
        title={t("sectionUnitTax")}
        description={t("sectionUnitTaxDesc")}
      >
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
                  error={errors.inventory_unit_id?.message}
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
      </SettingSection>

      {/* Deviations & thresholds */}
      <SettingSection
        title={t("sectionDeviations")}
        description={t("sectionDeviationsDesc")}
      >
        <Field data-invalid={!!errors.price_deviation_limit}>
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
                  errors.price_deviation_limit ? "pl-8" : ""
                }`}
                error={errors.price_deviation_limit?.message}
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

        <Field data-invalid={!!errors.qty_deviation_limit}>
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
                  errors.qty_deviation_limit ? "pl-8" : ""
                }`}
                error={errors.qty_deviation_limit?.message}
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
      </SettingSection>

      {/* Codes & cost */}
      <SettingSection
        title={t("sectionCodesCost")}
        description={t("sectionCodesCostDesc")}
      >
        <Field>
          <FieldLabel>{tfl("sku")}</FieldLabel>
          {isDisabled ? (
            <ReadOnlyValue value={v.sku} />
          ) : (
            <Input
              className="h-9"
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
              className="h-9"
              placeholder={t("barcodePlaceholder")}
              {...form.register("barcode")}
            />
          )}
        </Field>

        <Field data-invalid={!!errors.price}>
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
              error={errors.price?.message}
              errorIconAlign="left"
              {...form.register("price")}
            />
          )}
        </Field>
      </SettingSection>

      {/* Flags */}
      <SettingSection
        title={t("sectionFlags")}
        description={t("sectionFlagsDesc")}
      >
        <div className="flex flex-col gap-3 sm:col-span-2">
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
      </SettingSection>

      {/* Images — เล็ก อยู่ในคอลัมน์ขวาของ section ปกติ */}
      {product && (
        <SettingSection
          title={t("imgSection")}
          description={t("imgSectionDesc")}
        >
          <div className="w-40">
            <ProductImages
              productId={product?.id}
              readOnly={isDisabled}
              pendingFiles={pendingImages}
              onPendingFilesChange={onPendingImagesChange}
            />
          </div>
        </SettingSection>
      )}

      {/* Attributes — merged from former Product Info tab */}
      <SettingSection
        wide
        title={t("sectionAttributes")}
        description={t("sectionAttributesDesc")}
        count={infoFields.length}
        action={
          !isDisabled && infoFields.length > 0 ? (
            <Button type="button" size="xs" onClick={addAttribute}>
              <Plus aria-hidden="true" />
              {t("addAttribute")}
            </Button>
          ) : undefined
        }
      >
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
                    <span className="text-xs font-semibold capitalize">
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
            <p className="text-sm font-semibold">{t("noAdditionalInfo")}</p>
            <p className="text-muted-foreground text-xs">
              {t.rich("addFirstAttributeHintRich", {
                code: (chunks) => (
                  <code className="bg-muted text-micro mx-0.5 rounded px-1.5 py-0.5">
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
      </SettingSection>

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

export default memo(PdTabGeneral);

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
  "use no memo";
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div
          className={`text-sm font-semibold ${disabled ? "text-muted-foreground" : ""}`}
        >
          {title}
        </div>
        <div className="text-muted-foreground text-micro">{desc}</div>
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
 * ค่าโหมด view = หน้าตาเหมือน disabled input (ขอบ + พื้น bg-muted + จาง) ตรงกับ
 * disabled input จริงของแอป — จางแบบกดไม่ได้ ต่างจาก input โหมด edit ชัด ·
 * ใช้ค่าที่ resolve มาแล้ว (product.*.name) ไม่ต้องยิง query lookup ในโหมด view ·
 * ค่าว่างแสดง `—` · รองรับ `suffix` (เช่น %) และ `multiline` (สำหรับ description)
 */
function ReadOnlyValue({ value, suffix, multiline }: ReadOnlyValueProps) {
  "use no memo";
  const isEmpty = value === null || value === undefined || value === "";
  return (
    <div
      className={cn(
        "border-input bg-muted/60 min-h-9 cursor-not-allowed rounded-md border px-3 py-1.5 text-sm break-words opacity-60",
        multiline ? "whitespace-pre-wrap" : "flex items-center",
        isEmpty && "text-muted-foreground",
      )}
    >
      {isEmpty ? (
        "—"
      ) : (
        <>
          {value}
          {suffix && (
            <span className="text-muted-foreground ml-1">{suffix}</span>
          )}
        </>
      )}
    </div>
  );
}
