import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "react-router";
import { useTranslations } from "use-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
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
import { GrnHeader } from "./grn-header";
import { GrnSummaryFooter } from "./grn-summary-footer";
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

  // เพิ่มทุกครั้งที่ validation ไม่ผ่าน — ส่งให้ items grid auto-expand group ที่
  // location/qty/discount/tax ติด error (field อยู่ใน group expand เท่านั้น) + scroll
  const [revealErrorSignal, setRevealErrorSignal] = useState(0);
  const revealErrors = () => {
    setRevealErrorSignal((c) => c + 1);
    // scroll หา field แรกที่ผิด — retry ข้ามเฟรมจน group ที่ auto-expand mount field เสร็จ
    scrollToFirstInvalidField();
  };

  const actions = useGrnFormActions({
    form,
    goodsReceiveNote,
    defaultValues,
    mode,
    setMode,
    revealErrors,
  });

  const isDisabled = isView || actions.isPending;

  // Document info ribbon — buyer/requestor + department แสดงอย่างเดียว (ไม่เข้า payload),
  // grn_date เป็น field จริง
  const { dateFormat, defaultBu, data: profileData } = useProfile();

  // Rebaseline dirty state หลัง compute-sync ของ location (discount/tax/net/total)
  // settle. RHF คิด isDirty จาก !deepEqual(getValues(), defaultValues) → setValue
  // ค่า derived ที่ต่างจาก default ทำให้ dirty ค้าง → back/cancel ติด discard dialog
  // เกินจริง. reset(getValues, keepDirtyValues) ทำให้ค่า derived เป็น baseline
  // (ไม่นับ dirty) แต่คงค่าที่ผู้ใช้แก้ไว้ — ทำครั้งเดียวหลัง data พร้อม (mirror PO)
  const didRebaseline = useRef(false);
  useEffect(() => {
    if (didRebaseline.current) return;
    if (!goodsReceiveNote && !profileData) return;
    didRebaseline.current = true;
    form.reset(form.getValues(), { keepDirtyValues: true });
    // reset() re-validate ทั้งฟอร์ม → required field ที่ยังว่าง (เช่น currency
    // default ที่ header เพิ่งจะตั้งทีหลัง) โชว์ error แดงทั้งที่ user ยังไม่แตะ →
    // clear ทิ้ง (mode onChange จะ validate ใหม่เองเมื่อ user แก้จริง)
    form.clearErrors();
  }, [form, goodsReceiveNote, profileData]);

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
        onShowComment={() => actions.setShowComment(true)}
        onShowDelete={() => actions.setShowDelete(true)}
        onSaveDraft={() => actions.handleSubmitWithStatus("draft")}
        onSave={() => actions.handleSubmitWithStatus("saved")}
      />

      <form
        id="grn-form"
        onSubmit={form.handleSubmit(actions.onSubmit, revealErrors)}
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
              revealErrorSignal={revealErrorSignal}
            />
          </TabsContent>
          <TabsContent value="extra-cost">
            <GrnExtraCostFields form={form} disabled={isDisabled} />
          </TabsContent>
        </Tabs>
      </form>

      <GrnSummaryFooter
        form={form}
        isActionPending={actions.isActionPending}
        hasRecord={!!goodsReceiveNote}
        isView={mode === "view"}
        isCommitted={isCommitted}
        isVoid={isVoid}
        onCommit={() => actions.setShowCommit(true)}
        onVoid={() => actions.setShowVoid(true)}
      />

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
