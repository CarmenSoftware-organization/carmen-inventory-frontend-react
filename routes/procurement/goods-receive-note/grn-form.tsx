import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "react-router";
import { useTranslations } from "use-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, round2 } from "@/lib/currency-utils";
import { SummaryFooterBar } from "@/components/ui/summary-bar";
import type { GoodsReceiveNote } from "@/types/goods-receive-note";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import type { FormMode } from "@/types/form";
import { GrnExtraCostFields } from "./grn-extra-cost-fields";
import {
  createGrnSchema,
  type GrnFormValues,
  getDefaultValues,
} from "./grn-form-schema";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { getSessionItem, removeSessionItem } from "@/lib/safe-storage";
import { GrnItemTable } from "./grn-item-table";
import { GrnFormDialogs } from "./grn-form-dialogs";
import { useGrnFormActions } from "./use-grn-form-actions";
import { useProfile } from "@/hooks/use-profile";
import { useCurrency } from "@/hooks/use-currency";
import { GrnHeader } from "./grn-header";
import { GrnFormHeader } from "./grn-form-header";

interface GrnFormProps {
  readonly goodsReceiveNote?: GoodsReceiveNote;
}

export function GrnForm({ goodsReceiveNote }: GrnFormProps) {
  "use no memo";
  const t = useTranslations("procurement.goodsReceiveNote");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");
  const [mode, setMode] = useState<FormMode>(goodsReceiveNote ? "view" : "add");
  const isView = mode === "view";

  const isCommitted = goodsReceiveNote?.doc_status === "committed";
  const isVoid = goodsReceiveNote?.doc_status === "voided";

  const [searchParams] = useSearchParams();
  const docTypeParam = searchParams.get("doc_type");

  const [wizardData] = useState(() =>
    goodsReceiveNote
      ? null
      : (getSessionItem<{
          vendorId: string;
          vendorName: string;
          currencyId: string;
          currencyCode: string;
          exchangeRate: number;
          items?: GrnFormValues["items"];
        }>("grn-wizard-data") ?? null),
  );
  const fromWizard = !!wizardData;

  const defaultValues = useMemo(() => {
    const base = getDefaultValues(goodsReceiveNote);
    if (goodsReceiveNote) return base;

    if (docTypeParam) base.doc_type = docTypeParam;

    if (!wizardData) return base;

    base.vendor_id = wizardData.vendorId;
    base.vendor_name = wizardData.vendorName;
    base.currency_id = wizardData.currencyId;
    base.currency_name = wizardData.currencyCode;
    base.exchange_rate = wizardData.exchangeRate;
    if (Array.isArray(wizardData.items) && wizardData.items.length > 0) {
      base.items = wizardData.items;
    }
    return base;
  }, [goodsReceiveNote, docTypeParam, wizardData]);

  const form = useForm<GrnFormValues>({
    resolver: zodResolver(createGrnSchema(tv, tfl)) as Resolver<GrnFormValues>,
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const actions = useGrnFormActions({
    form,
    goodsReceiveNote,
    defaultValues,
    mode,
    setMode,
  });

  const isDisabled = isView || actions.isPending;

  // Document info ribbon — buyer/requestor + department แสดงอย่างเดียว (ไม่เข้า payload),
  // grn_date เป็น field จริง
  const { dateFormat, defaultBu, data: profileData } = useProfile();
  const watchedGrnDate = useWatch({ control: form.control, name: "grn_date" });
  const watchedDescription = useWatch({
    control: form.control,
    name: "description",
  });
  const receivedByName =
    goodsReceiveNote?.received_by_name ||
    [profileData?.user_info?.firstname, profileData?.user_info?.lastname]
      .filter(Boolean)
      .join(" ");
  const departmentName = defaultBu?.department?.name ?? "";

  const extraCostCount =
    useWatch({
      control: form.control,
      name: "extra_cost_details",
    })?.length ?? 0;

  const { data: currencyData } = useCurrency({ perpage: -1 });
  const currencies = currencyData?.data?.filter((c) => c.is_active) ?? [];

  // grand summary — รวมยอดจากทุก item (net/discount/tax/total ที่คำนวณไว้แล้ว)
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  // currency code — derive จาก list ตาม currency_id (fallback currency_name)
  // เหมือน grn-form-header เพราะบาง record ไม่เก็บ currency_name
  const currencyId = useWatch({ control: form.control, name: "currency_id" });
  const currencyName =
    useWatch({ control: form.control, name: "currency_name" }) ?? "";
  const currencyCode =
    currencies.find((c) => c.id === currencyId)?.code || currencyName;
  let totalDiscount = 0;
  let totalNet = 0;
  let totalTax = 0;
  let grandTotal = 0;
  for (const it of items) {
    totalDiscount += Number(it?.discount_amount) || 0;
    totalNet += Number(it?.net_amount) || 0;
    totalTax += Number(it?.tax_amount) || 0;
    grandTotal += Number(it?.total_price) || 0;
  }
  const summary = {
    subtotal: round2(totalNet + totalDiscount),
    totalDiscount: round2(totalDiscount),
    totalNet: round2(totalNet),
    totalTax: round2(totalTax),
    grandTotal: round2(grandTotal),
  };
  const hasItems = items.length > 0;

  // Clear wizard data on SPA navigation (unmount) but keep on browser refresh
  useEffect(() => {
    let isRefresh = false;
    const onBeforeUnload = () => {
      isRefresh = true;
    };
    globalThis.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      globalThis.removeEventListener("beforeunload", onBeforeUnload);
      if (!isRefresh) removeSessionItem("grn-wizard-data");
    };
  }, []);

  return (
    <div className="flex min-h-full flex-col space-y-4">
      <GrnHeader
        goodsReceiveNote={goodsReceiveNote}
        mode={mode}
        isPending={actions.isPending}
        isActionPending={actions.isActionPending}
        isCommitted={isCommitted}
        isVoid={isVoid}
        deleteIsPending={actions.deleteGrn.isPending}
        receivedByName={receivedByName}
        departmentName={departmentName}
        grnDate={watchedGrnDate}
        dateFormat={dateFormat}
        onBack={actions.handleBack}
        onEnterEdit={() => setMode("edit")}
        onCancel={actions.handleCancel}
        onShowCommit={() => actions.setShowCommit(true)}
        onShowVoid={() => actions.setShowVoid(true)}
        onShowComment={() => actions.setShowComment(true)}
        onShowDelete={() => actions.setShowDelete(true)}
        onSaveDraft={() => actions.handleSubmitWithStatus("draft")}
        onSave={() => actions.handleSubmitWithStatus("saved")}
      />

      <form
        id="grn-form"
        onSubmit={form.handleSubmit(actions.onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
        className="space-y-3 px-4"
      >
        <GrnFormHeader
          form={form}
          disabled={isDisabled}
          fromWizard={fromWizard}
          plainText={isView}
        />

        {/* view แสดงเฉพาะเมื่อมี value; ตอนแก้ได้แสดง Textarea เสมอ */}
        {(!isView || watchedDescription?.trim()) && (
          <Field className={isView ? "gap-1" : undefined}>
            <FieldLabel
              htmlFor="grn-description"
              className={
                isView ? "text-muted-foreground font-normal" : undefined
              }
            >
              {tfl("description")}
            </FieldLabel>
            {isView ? (
              <p className="min-h-8 text-xs whitespace-pre-wrap">
                {watchedDescription}
              </p>
            ) : (
              <Textarea
                id="grn-description"
                placeholder={t("descriptionPlaceholder")}
                maxLength={256}
                rows={2}
                disabled={isDisabled}
                {...form.register("description")}
              />
            )}
          </Field>
        )}

        <Tabs defaultValue="general">
          <TabsList variant="line">
            <TabsTrigger value="general" className="text-xs">
              {t("tabGeneral")}
            </TabsTrigger>
            <TabsTrigger value="extra-cost" className="text-xs">
              {t("tabExtraCost")}
              {extraCostCount > 0 && (
                <Badge
                  variant="secondary"
                  size="xs"
                  className="ml-1.5 tabular-nums"
                >
                  {extraCostCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <GrnItemTable
              form={form}
              disabled={isDisabled}
              plainText={isView}
            />
          </TabsContent>
          <TabsContent value="extra-cost">
            <GrnExtraCostFields form={form} disabled={isDisabled} />
          </TabsContent>
        </Tabs>
      </form>

      {hasItems && (
        <SummaryFooterBar
          hasRecord
          items={[
            {
              key: "subtotal",
              label: tfl("subtotal"),
              value: formatCurrency(summary.subtotal),
            },
            {
              key: "discount",
              label: tfl("discount"),
              value:
                summary.totalDiscount > 0
                  ? `-${formatCurrency(summary.totalDiscount)}`
                  : formatCurrency(0),
              valueClassName:
                summary.totalDiscount > 0
                  ? "text-destructive font-semibold"
                  : "font-semibold",
            },
            {
              key: "net",
              label: tfl("net"),
              value: formatCurrency(summary.totalNet),
            },
            {
              key: "tax",
              label: tfl("tax"),
              value: formatCurrency(summary.totalTax),
            },
            {
              key: "grandTotal",
              label: tfl("grandTotal"),
              value: formatCurrency(summary.grandTotal),
              emphasis: true,
              suffix: currencyCode,
            },
          ]}
        />
      )}

      <DiscardDialog {...actions.discardDialogProps} variant="warning" />
      <DiscardDialog {...actions.navDiscardDialogProps} variant="warning" />

      {goodsReceiveNote && (
        <GrnFormDialogs
          goodsReceiveNote={goodsReceiveNote}
          showDelete={actions.showDelete}
          setShowDelete={actions.setShowDelete}
          isDeletePending={actions.deleteGrn.isPending}
          onConfirmDelete={actions.handleConfirmDelete}
          showCommit={actions.showCommit}
          setShowCommit={actions.setShowCommit}
          isCommitPending={actions.commitGrn.isPending}
          onConfirmCommit={actions.handleConfirmCommit}
          showVoid={actions.showVoid}
          setShowVoid={actions.setShowVoid}
          isVoidPending={actions.voidGrn.isPending}
          onConfirmVoid={actions.handleConfirmVoid}
          showComment={actions.showComment}
          setShowComment={actions.setShowComment}
        />
      )}
    </div>
  );
}
