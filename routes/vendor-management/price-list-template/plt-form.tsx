import { useEffect, useState } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "use-intl";
import { Pencil, Save, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { PL_STATUS_TONE } from "@/constant/price-list";
import {
  Field,
  FieldDescription,
  FieldInput,
  FieldLabel,
  FieldPlainText,
  FieldSelect,
} from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LookupCurrency } from "@/components/lookup/lookup-currency";
import { useAllProducts } from "@/hooks/use-all-products";
import { PRICE_LIST_TEMPLATE_STATUS_OPTIONS } from "@/constant/price-list-template";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { DocFormHeader } from "@/components/share/doc-form-header";
import { useProfile } from "@/hooks/use-profile";
import type { PriceListTemplate } from "@/types/price-list-template";
import type { FormMode } from "@/types/form";

import { SettingSection } from "@/components/ui/setting-section";

import {
  createPltSchema,
  getDefaultValues,
  PLT_DETAIL_EMPTY,
  type PltFormValues,
} from "./plt-form-schema";
import { PltValidityStepper } from "./plt-validity-stepper";
import { PltFormProductsSection } from "./plt-form-products-section";
import { PltFormDialogs } from "./plt-form-dialogs";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { usePltFormActions } from "./use-plt-form-actions";
import { FORM_ID } from "./plt-form-helpers";
import { useProductLabels, useStepperLabels } from "./plt-form-labels";

interface PriceListTemplateFormProps {
  readonly priceListTemplate?: PriceListTemplate;
}

export function PriceListTemplateForm({
  priceListTemplate,
}: PriceListTemplateFormProps) {
  const t = useTranslations("vendorManagement.priceListTemplate");
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const tform = useTranslations("form");
  const tv = useTranslations("validation");
  const ts = useTranslations("status");

  const [mode, setMode] = useState<FormMode>(
    priceListTemplate ? "view" : "add",
  );
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const [removeDetailIndex, setRemoveDetailIndex] = useState<number | null>(
    null,
  );
  const [removeProductId, setRemoveProductId] = useState<string | null>(null);

  const { defaultCurrencyId } = useProfile();
  const defaultValues = getDefaultValues(priceListTemplate, {
    defaultCurrencyId,
  });

  const form = useForm<PltFormValues>({
    resolver: zodResolver(createPltSchema(tv, tfl)) as Resolver<PltFormValues>,
    defaultValues,
  });

  // หลัง save (edit) → mutation invalidate → byId refetch → priceListTemplate มา
  // ใหม่ (full-replace ทำให้ product ได้ id ใหม่) · re-sync form ในโหมด view ให้
  // โชว์ข้อมูล server จริง และ edit ครั้งถัดไปอ่าน id ใหม่ (ไม่งั้น remove จะใช้ id
  // เก่าที่ถูกลบไปแล้ว → save ซ้ำ = duplicate) · key ด้วยชุด product id ที่เปลี่ยน
  // ทุกครั้งที่ item ถูก add/remove/replace
  const productIdsKey = (priceListTemplate?.products ?? [])
    .map((p) => p.id)
    .join(",");
  useEffect(() => {
    if (mode === "view" && priceListTemplate) {
      form.reset(getDefaultValues(priceListTemplate, { defaultCurrencyId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form/getDefaultValues stable; mode/defaultCurrencyId อ่านโดยไม่ retrigger
  }, [productIdsKey, priceListTemplate?.id]);

  const {
    fields: detailFields,
    append: appendDetail,
    prepend: prependDetail,
    remove: removeDetail,
  } = useFieldArray({
    control: form.control,
    name: "details",
  });

  const actions = usePltFormActions({
    form,
    priceListTemplate,
    defaultValues,
    mode,
    setMode,
  });

  const isDisabled = isView || actions.isPending;
  const navGuard = useNavigationGuard(
    (isAdd || isEdit) && form.formState.isDirty,
  );

  const watchedValidity = useWatch({
    control: form.control,
    name: "validity_period",
  });
  const watchedStatus = useWatch({ control: form.control, name: "status" });
  const watchedName = useWatch({ control: form.control, name: "name" });

  const { data: allProducts = [], isLoading: productsLoading } =
    useAllProducts();
  const watchedDetails = useWatch({ control: form.control, name: "details" });
  const selectedProductIds = new Set(
    (watchedDetails ?? []).map((d) => d.product_id).filter(Boolean),
  );

  const handleAddProduct = () => {
    prependDetail({ ...PLT_DETAIL_EMPTY });
  };

  // ติ๊ก tree → sync กับ details: product ที่ติ๊กใหม่ = เพิ่มแถวเปล่า (unit
  // auto-select เองใน UnitCell), product ที่เอาติ๊กออก = ลบทุกแถวของ product นั้น
  // (รวม moq tier หลายแถว) · group toggle ยิงทิศเดียวเสมอ เพิ่ม/ลบ ไม่ปนกัน
  const handleTreeSelectionChange = (ids: string[]) => {
    const next = new Set(ids);
    const rows = form.getValues("details");
    const removeIdx = rows.reduce<number[]>((acc, d, i) => {
      if (d.product_id && !next.has(d.product_id)) acc.push(i);
      return acc;
    }, []);
    const current = new Set(rows.map((d) => d.product_id).filter(Boolean));
    const added = ids.filter((id) => !current.has(id));
    if (removeIdx.length) removeDetail(removeIdx);
    if (added.length)
      prependDetail(
        added.map((id) => ({ ...PLT_DETAIL_EMPTY, product_id: id })),
      );
  };

  // เพิ่ม MOQ tier อีกหน่วยให้ product เดิม (แถวใหม่ product_id เดียวกัน)
  // default qty = max ของ tier เดิม +1 กันชนกับ qty ที่มีอยู่แล้วตั้งแต่แรก
  const handleAddTier = (productId: string) => {
    const qtys = form
      .getValues("details")
      .filter((r) => r.product_id === productId)
      .map((r) => Number(r.qty) || 0);
    const nextQty = qtys.length ? Math.max(...qtys) + 1 : 1;
    appendDetail({ ...PLT_DETAIL_EMPTY, product_id: productId, qty: nextQty });
  };

  const handleConfirmRemoveTier = () => {
    if (removeDetailIndex === null) return;
    removeDetail(removeDetailIndex);
    setRemoveDetailIndex(null);
  };

  // ลบทั้ง product (ทุก tier) — เท่ากับเอาติ๊กออกจาก tree · confirm ก่อนลบ
  const handleConfirmRemoveProduct = () => {
    if (removeProductId === null) return;
    const idx = form.getValues("details").reduce<number[]>((acc, d, i) => {
      if (d.product_id === removeProductId) acc.push(i);
      return acc;
    }, []);
    if (idx.length) removeDetail(idx);
    setRemoveProductId(null);
  };

  const stepperLabels = useStepperLabels(t);
  const productLabels = useProductLabels(t, tfl);

  // ชื่อ product ที่กำลังจะลบ — ไว้โชว์ใน confirm dialog (master ก่อน, fallback ref)
  const removeProductName = removeProductId
    ? (allProducts.find((p) => p.id === removeProductId)?.name ??
      priceListTemplate?.products?.find(
        (p) => p.product_id === removeProductId,
      )?.product_name ??
      "")
    : "";
  const tsStatus = ts as (key: "draft" | "active" | "inactive") => string;
  const submitLabel = actions.isPending
    ? isAdd
      ? tform("creating")
      : tform("saving")
    : isAdd
      ? tc("create")
      : tc("save");

  return (
    <div className="mx-auto max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mb-6">
        <DocFormHeader
          flush
          title={watchedName || t("namePlaceholder")}
          titleMuted={!watchedName}
          backLabel={tc("goBack")}
          onBack={actions.handleBack}
          badges={
            <StatusDotBadge tone={PL_STATUS_TONE[watchedStatus] ?? "neutral"}>
              {tsStatus(watchedStatus)}
            </StatusDotBadge>
          }
          actions={
            isView ? (
              <Button size="sm" onClick={() => setMode("edit")}>
                <Pencil />
                {tc("edit")}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={actions.handleCancel}
                  disabled={actions.isPending}
                >
                  <X />
                  {tc("cancel")}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  form={FORM_ID}
                  disabled={actions.isPending}
                >
                  <Save />
                  {submitLabel}
                </Button>
                {isEdit && priceListTemplate && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => actions.setShowDelete(true)}
                    disabled={actions.isDeletePending || actions.isPending}
                  >
                    <Trash2 />
                    {tc("delete")}
                  </Button>
                )}
              </>
            )
          }
        />
      </div>

      <form
        id={FORM_ID}
        onSubmit={form.handleSubmit(actions.onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
      >
        {/* General */}
        <SettingSection
          first
          title={tfl("general")}
          description={t("generalDesc")}
        >
          <div className="grid grid-cols-2 gap-4 sm:col-span-2">
            {/* Name */}
            <Field>
              <FieldLabel htmlFor="plt-name">
                {tfl("name")}
                {!isView && <span className="text-destructive"> *</span>}
              </FieldLabel>
              {isView ? (
                <FieldPlainText>{form.getValues("name")}</FieldPlainText>
              ) : (
                <FieldInput
                  id="plt-name"
                  placeholder={t("namePlaceholder")}
                  disabled={isDisabled}
                  error={form.formState.errors.name?.message}
                  maxLength={100}
                  {...form.register("name")}
                />
              )}
            </Field>

            {/* Currency */}
            <Field>
              <FieldLabel>
                {tfl("currency")}
                {!isView && <span className="text-destructive"> *</span>}
              </FieldLabel>
              {isView ? (
                <FieldPlainText>
                  {priceListTemplate?.currency?.code}
                </FieldPlainText>
              ) : (
                <Controller
                  control={form.control}
                  name="currency_id"
                  render={({ field }) => (
                    <LookupCurrency
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isDisabled}
                      fullWidth
                      error={form.formState.errors.currency_id?.message}
                    />
                  )}
                />
              )}
            </Field>
          </div>

          {/* Validity period */}
          <Field className="sm:col-span-2">
            <FieldLabel>{tfl("validityPeriod")}</FieldLabel>
            {isView ? (
              <FieldPlainText>
                {watchedValidity
                  ? t("daysSuffix", { count: watchedValidity })
                  : null}
              </FieldPlainText>
            ) : (
              <>
                <FieldDescription>{stepperLabels.hint}</FieldDescription>
                <Controller
                  control={form.control}
                  name="validity_period"
                  render={({ field }) => (
                    <PltValidityStepper
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isDisabled}
                      labels={stepperLabels}
                    />
                  )}
                />
              </>
            )}
          </Field>

          {/* Description */}
          <Field className="sm:col-span-2">
            <FieldLabel>{tfl("description")}</FieldLabel>
            {isView ? (
              <FieldPlainText className="items-start whitespace-pre-wrap">
                {priceListTemplate?.description}
              </FieldPlainText>
            ) : (
              <Textarea
                placeholder={tfl("optional")}
                rows={2}
                maxLength={256}
                disabled={isDisabled}
                className="resize-none"
                {...form.register("description")}
              />
            )}
          </Field>

          {/* Status */}
          <Field className="sm:col-span-2">
            <FieldLabel>{tfl("status")}</FieldLabel>
            {isView ? (
              <div>
                <StatusDotBadge
                  tone={PL_STATUS_TONE[watchedStatus] ?? "neutral"}
                >
                  {tsStatus(watchedStatus)}
                </StatusDotBadge>
              </div>
            ) : (
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FieldSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isDisabled}
                    placeholder={tfl("selectStatus")}
                    error={form.formState.errors.status?.message}
                  >
                    <SelectContent>
                      {PRICE_LIST_TEMPLATE_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {tsStatus(
                            opt.value as "draft" | "active" | "inactive",
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </FieldSelect>
                )}
              />
            )}
          </Field>
        </SettingSection>

        {/* Vendor instructions */}
        <SettingSection
          title={t("vendorInstructionTitle")}
          description={t("vendorInstructionHelp")}
        >
          <Field className="sm:col-span-2">
            <FieldLabel>{t("vendorInstructionTitle")}</FieldLabel>
            {isView ? (
              <FieldPlainText className="items-start whitespace-pre-wrap">
                {priceListTemplate?.vendor_instructions}
              </FieldPlainText>
            ) : (
              <Textarea
                placeholder={t("vendorInstructionPlaceholder")}
                rows={5}
                maxLength={1000}
                disabled={isDisabled}
                className="resize-none leading-relaxed"
                {...form.register("vendor_instruction")}
              />
            )}
          </Field>
        </SettingSection>

        <PltFormProductsSection
          form={form}
          detailFields={detailFields}
          priceListTemplate={priceListTemplate}
          isView={isView}
          isDisabled={isDisabled}
          onAddProduct={handleAddProduct}
          onRemoveTier={setRemoveDetailIndex}
          labels={productLabels}
          allProducts={allProducts}
          productsLoading={productsLoading}
          selectedProductIds={selectedProductIds}
          onTreeSelectionChange={handleTreeSelectionChange}
          onAddTier={handleAddTier}
          onRemoveProduct={setRemoveProductId}
        />
      </form>

      <DiscardDialog {...actions.discardDialogProps} variant="warning" />

      <DiscardDialog
        open={navGuard.isOpen}
        onOpenChange={(o) => {
          if (!o) navGuard.cancel();
        }}
        onConfirm={navGuard.confirm}
        onCancel={navGuard.cancel}
        variant="warning"
      />

      <PltFormDialogs
        priceListTemplate={priceListTemplate}
        showDelete={actions.showDelete}
        setShowDelete={actions.setShowDelete}
        isDeletePending={actions.isDeletePending}
        onConfirmDelete={actions.handleConfirmDelete}
        removeDetailIndex={removeDetailIndex}
        setRemoveDetailIndex={setRemoveDetailIndex}
        onConfirmRemoveTier={handleConfirmRemoveTier}
        removeProductId={removeProductId}
        removeProductName={removeProductName}
        setRemoveProductId={setRemoveProductId}
        onConfirmRemoveProduct={handleConfirmRemoveProduct}
      />
    </div>
  );
}
