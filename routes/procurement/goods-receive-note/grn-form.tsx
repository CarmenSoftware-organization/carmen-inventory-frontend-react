import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "react-router";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { GoodsReceiveNote } from "@/types/goods-receive-note";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import type { FormMode } from "@/types/form";
import { GrnExtraCostFields } from "./grn-extra-cost-fields";
import {
  createGrnSchema,
  type GrnFormValues,
  getDefaultValues,
} from "./grn-form-schema";
import {
  countInvalidItems,
  scrollToFirstInvalidField,
} from "@/lib/form-helpers";
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

  // Document info ribbon — buyer/requestor + department แสดงอย่างเดียว (ไม่เข้า payload),
  // grn_date เป็น field จริง. defaultCurrency* ใช้เป็น currency เริ่มต้นของ GRN ใหม่
  const {
    dateFormat,
    defaultBu,
    data: profileData,
    defaultCurrencyId,
    defaultCurrencyCode,
  } = useProfile();

  const defaultValues = useMemo(() => {
    // currency default ของ BU set ตั้งแต่ getDefaultValues (mirror PO) — profile
    // โหลดตั้งแต่ boot จึงพร้อมตอน mount; wizard override ทับทีหลังถ้ามา from wizard
    const base = getDefaultValues(goodsReceiveNote, {
      defaultCurrencyId,
      defaultCurrencyCode,
    });
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
  }, [
    goodsReceiveNote,
    docTypeParam,
    wizardData,
    defaultCurrencyId,
    defaultCurrencyCode,
  ]);

  const form = useForm<GrnFormValues>({
    resolver: zodResolver(createGrnSchema(tv, tfl)) as Resolver<GrnFormValues>,
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  // เพิ่มทุกครั้งที่ validation ไม่ผ่าน — ส่งให้ items grid auto-expand group ที่
  // location/qty/discount/tax ติด error (field อยู่ใน group expand เท่านั้น) + scroll
  const [revealErrorSignal, setRevealErrorSignal] = useState(0);
  const revealErrors = (errors?: Record<string, unknown>) => {
    setRevealErrorSignal((c) => c + 1);
    const count = countInvalidItems(errors);
    toast.warning(
      count > 0 ? tv("incompleteItems", { count }) : tv("incompleteDocument"),
    );
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

  // ข้อมูลที่ refetch มาหลังบันทึก (PATCH แล้วตามด้วย /save — หลังบ้านเดิน
  // doc_version ทั้งของใบและของแต่ละแถว) ต้อง rebase เข้าฟอร์มด้วย ไม่งั้นฟอร์ม
  // ถือ doc_version ของรอบก่อน แล้วการแก้รอบถัดไปชน 409 "มีคนอื่นแก้เอกสารนี้"
  // ทุกครั้งจนกว่าจะ refresh หน้า · เงื่อนไขคือ "ไม่มีของค้าง" ไม่ใช่ "โหมดอ่าน" —
  // ระหว่างผู้ใช้กรอกค้างห้ามทับ แต่หลังบันทึกเสร็จ (dirty ถูกล้าง) ต้อง rebase
  // ให้ได้แม้ยังอยู่หน้าเดิม
  useEffect(() => {
    if (!goodsReceiveNote || form.formState.isDirty) return;
    form.reset(defaultValues);
  }, [goodsReceiveNote, defaultValues, form]);

  const watchedGrnDate = useWatch({ control: form.control, name: "grn_date" });
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
          disabled={isDisabled || isView}
          fromWizard={fromWizard}
        />

        {/* เส้นคั่นเต็มความกว้าง แยกข้อมูลหัวใบออกจากตารางรายการ (เหมือน PO)
            สองก้อนนี้อ่านคนละจังหวะ ก้อนบนอ่านทีเดียวจบ ก้อนล่างกวาดตาทีละแถว */}
        <hr className="border-border" />

        <Tabs defaultValue="general">
          <TabsList variant="line">
            <TabsTrigger value="general" className="text-xs">
              {t("tabItems")}
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
