
import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/lib/compat/navigation";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import {
  useForm,
  useFormState,
  useWatch,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Stepper,
  StepperContent,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/components/ui/stepper";
import { useProfile } from "@/hooks/use-profile";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { useCreatePurchaseOrder } from "@/hooks/use-purchase-order";
import { PO_TYPE } from "@/types/purchase-order";
import { createPoSchema } from "../_components/po-form-schema";
import { buildPoPayload } from "../_components/build-po-payload";
import {
  getDefaultValues,
  type FromPriceListFormValues,
} from "./from-price-list-form-schema";
import { StepOrderDetails } from "./_components/step-order-details";
import { StepSelectVendors } from "./_components/step-select-vendors";
import { StepSelectItems } from "./_components/step-select-items";
import { recomputeItemFromLocations } from "./_components/recompute-item-pricing";
import { StepSummary } from "./_components/step-summary";

type Step = 1 | 2 | 3 | 4;

const STEPS: ReadonlyArray<{
  readonly step: Step;
  readonly labelKey:
    | "fromPriceListStep1"
    | "fromPriceListStep2"
    | "fromPriceListStep3"
    | "fromPriceListStep4";
  readonly descKey:
    | "fromPriceListStep1Desc"
    | "fromPriceListStep2Desc"
    | "fromPriceListStep3Desc"
    | "fromPriceListStep4Desc";
}> = [
  {
    step: 1,
    labelKey: "fromPriceListStep1",
    descKey: "fromPriceListStep1Desc",
  },
  {
    step: 2,
    labelKey: "fromPriceListStep2",
    descKey: "fromPriceListStep2Desc",
  },
  {
    step: 3,
    labelKey: "fromPriceListStep3",
    descKey: "fromPriceListStep3Desc",
  },
  {
    step: 4,
    labelKey: "fromPriceListStep4",
    descKey: "fromPriceListStep4Desc",
  },
];

const PO_LIST_PATH = "/procurement/purchase-order";
const COMPLETED_INDICATOR = <Check className="size-3" aria-hidden="true" />;
const INDICATOR_ACCENT =
  "data-[state=active]:bg-[var(--module-procurement)] data-[state=active]:text-white data-[state=completed]:bg-[var(--module-procurement)] data-[state=completed]:text-white";

// Only fields the user can edit on Step 1 — order_date, buyer_*, department_* are
// read-only seeds from useProfile() and never need validation.
const STEP_1_FIELDS = ["workflow_id", "delivery_date"] as const;
const STEP_2_FIELDS = ["vendor_id"] as const;
const STEP_3_FIELDS = ["items"] as const;

export function FromPriceListContent() {
  const router = useRouter();
  const t = useTranslations("procurement.purchaseOrder");
  const tc = useTranslations("common");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");
  const tf = useTranslations("field");
  const profile = useProfile();

  const [step, setStep] = useState<Step>(1);

  const poSchema = createPoSchema(tv, tf, true);

  const form = useForm<FromPriceListFormValues>({
    resolver: zodResolver(poSchema) as Resolver<FromPriceListFormValues>,
    defaultValues: getDefaultValues({
      userId: profile.userId,
      fullName: profile.fullName,
      email: profile.data?.email,
    }),
  });

  const profileSeedRef = useRef({
    userId: profile.userId,
    fullName: profile.fullName,
    email: profile.data?.email,
  });

  useEffect(() => {
    profileSeedRef.current = {
      userId: profile.userId,
      fullName: profile.fullName,
      email: profile.data?.email,
    };
  });

  useEffect(() => {
    if (!profile.isProfileReady) return;
    form.reset(getDefaultValues(profileSeedRef.current));
  }, [profile.isProfileReady, form]);

  const handleCancel = () => router.push(PO_LIST_PATH);
  const handleBack = () => setStep((s) => Math.max(1, s - 1) as Step);

  const validateCurrentStep = async (current: Step) => {
    if (current === 1) {
      const ok = await form.trigger(STEP_1_FIELDS);
      if (!ok) {
        scrollToFirstInvalidField();
        return false;
      }
    }
    if (current === 2) {
      const ok = await form.trigger(STEP_2_FIELDS);
      if (!ok) {
        scrollToFirstInvalidField();
        return false;
      }
    }
    if (current === 3) {
      const ok = await form.trigger(STEP_3_FIELDS);
      if (!ok) {
        scrollToFirstInvalidField();
        return false;
      }
    }
    return true;
  };

  // Reactive validity ของ step ปัจจุบัน — ใช้ disable ปุ่ม Next
  // (required field ว่าง หรือมี error ค้างอยู่ → ปิดปุ่ม)
  const watchedWorkflowId = useWatch({
    control: form.control,
    name: "workflow_id",
  });
  const watchedDeliveryDate = useWatch({
    control: form.control,
    name: "delivery_date",
  });
  const watchedVendorId = useWatch({
    control: form.control,
    name: "vendor_id",
  });
  const watchedItems = useWatch({ control: form.control, name: "items" });
  const { errors } = useFormState({ control: form.control });

  // ทุก item ต้องเลือก delivery location ครบทุกแถวก่อนไป Step 4
  // (location id เป็น required ใน schema — ถ้าปล่อยว่างจะ fail ตอน confirm)
  const allItemsHaveLocation =
    (watchedItems?.length ?? 0) > 0 &&
    (watchedItems ?? []).every(
      (it) => it.locations.length > 0 && it.locations.every((loc) => !!loc.id),
    );

  const stepValidity: Record<Step, boolean> = {
    1:
      !!watchedWorkflowId &&
      !!watchedDeliveryDate &&
      !errors.workflow_id &&
      !errors.delivery_date,
    2: !!watchedVendorId && !errors.vendor_id,
    3: allItemsHaveLocation && !errors.items,
    4: true,
  };
  const isCurrentStepValid = stepValidity[step];

  const handleNext = async () => {
    const ok = await validateCurrentStep(step);
    if (!ok) return;
    setStep((s) => Math.min(4, s + 1) as Step);
  };

  const handleStepChange = async (v: number) => {
    if (createPo.isPending) return;
    const target = Math.min(4, Math.max(1, v)) as Step;
    if (target <= step) {
      setStep(target);
      return;
    }
    const ok = await validateCurrentStep(step);
    if (!ok) return;
    setStep(target);
  };

  const createPo = useCreatePurchaseOrder();

  const handleEditStep = (target: 1 | 2 | 3) => setStep(target);

  const handleConfirm = async () => {
    if (createPo.isPending) return;
    // Validate all wizard fields ก่อน confirm (Step 1-3); Step 4 = review เฉย ๆ
    const ok = await form.trigger();
    if (!ok) {
      // Jump กลับ step ที่มี field ผิดเพื่อให้ user เห็น + แก้ได้
      // currency_id/order_date/exchange_rate validate เฉพาะตอนนี้ (ไม่อยู่ใน
      // STEP_*_FIELDS) — else ปิดท้ายไป Step 3 กันกรณี error หลุดทุกเงื่อนไข
      // ไม่งั้นปุ่มจะกดแล้วเงียบโดยไม่มีอะไรบอก user
      const errs = form.formState.errors;
      if (errs.workflow_id || errs.delivery_date || errs.order_date) setStep(1);
      else if (errs.vendor_id) setStep(2);
      else setStep(3);
      // รอ DOM ของ step ปลายทาง mount ก่อนค่อย scroll + focus invalid field
      requestAnimationFrame(() => scrollToFirstInvalidField());
      toast.error(tv("formIncomplete"));
      return;
    }
    // Sync ค่าระดับ item จาก locations ก่อนสร้าง payload — wizard ไม่มี
    // PoItemComputedSync คอย sync ให้ ค่า qty/amount ระดับ item จึงอาจค้างค่าเดิม
    const values = form.getValues();
    const syncedValues = {
      ...values,
      items: (values.items ?? []).map(recomputeItemFromLocations),
    };
    const payload = buildPoPayload(
      syncedValues,
      [],
      form.formState.dirtyFields.items as Record<string, unknown>[] | undefined, // RHF 7.78 type drift
      { po_type: PO_TYPE.PL },
    );
    createPo.mutate(payload, {
      onSuccess: (res) => {
        toast.success(tt("createSuccess", { entity: t("entity") }));
        const body = res as { data?: { id?: string } } | undefined;
        const newId = body?.data?.id;
        if (newId) {
          router.push(`${PO_LIST_PATH}/${newId}`);
        } else {
          router.push(PO_LIST_PATH);
        }
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="flex flex-col gap-4 p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleCancel}
          aria-label={tc("goBack")}
          className="mt-0.5"
        >
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold">{t("fromPriceList")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("fromPriceListDesc")}
          </p>
        </div>
      </header>

      {/* Mobile + Tablet (< lg / 1024px): horizontal stepper on top */}
      <Stepper
        value={step}
        onValueChange={handleStepChange}
        indicators={{ completed: COMPLETED_INDICATOR }}
        className="lg:hidden"
      >
        <StepperNav>
          {STEPS.map(({ step: s, labelKey }, i, arr) => (
            <StepperItem key={s} step={s}>
              <StepperTrigger className="flex-col gap-1">
                <StepperIndicator className={INDICATOR_ACCENT}>
                  {s}
                </StepperIndicator>
                <StepperTitle className="text-[0.625rem] font-semibold">
                  {t(labelKey)}
                </StepperTitle>
              </StepperTrigger>
              {i < arr.length - 1 && (
                <StepperSeparator className="group-data-[state=completed]/step:bg-module-procurement" />
              )}
            </StepperItem>
          ))}
        </StepperNav>
        <StepperPanel className="mt-4">
          <StepperContent value={1}>
            <StepOrderDetails form={form} />
          </StepperContent>
          <StepperContent value={2}>
            <StepSelectVendors form={form} />
          </StepperContent>
          <StepperContent value={3}>
            <StepSelectItems form={form} />
          </StepperContent>
          <StepperContent value={4}>
            <StepSummary form={form} onEditStep={handleEditStep} />
          </StepperContent>
        </StepperPanel>
      </Stepper>

      {/* Desktop (≥ lg / 1024px): vertical stepper on left, content on right */}
      <Stepper
        value={step}
        onValueChange={handleStepChange}
        orientation="vertical"
        indicators={{ completed: COMPLETED_INDICATOR }}
        className="hidden lg:grid lg:grid-cols-[16rem_1fr] lg:items-start lg:gap-8"
      >
        <StepperNav>
          {STEPS.map(({ step: s, labelKey, descKey }, i, arr) => (
            <StepperItem
              key={s}
              step={s}
              className="relative items-start not-last:flex-1"
            >
              <StepperTrigger className="items-start gap-3 pb-10 last:pb-0">
                <StepperIndicator className={INDICATOR_ACCENT}>
                  {s}
                </StepperIndicator>
                <div className="mt-0.5 space-y-1 text-left">
                  <StepperTitle>{t(labelKey)}</StepperTitle>
                  <StepperDescription className="text-xs">
                    {t(descKey)}
                  </StepperDescription>
                </div>
              </StepperTrigger>
              {i < arr.length - 1 && (
                <StepperSeparator className="group-data-[state=completed]/step:bg-module-procurement absolute inset-y-0 top-7 left-3 -order-1 m-0 -translate-x-1/2 group-data-[orientation=vertical]/stepper-nav:h-[calc(100%-2rem)]" />
              )}
            </StepperItem>
          ))}
        </StepperNav>
        <StepperPanel>
          <StepperContent value={1}>
            <StepOrderDetails form={form} />
          </StepperContent>
          <StepperContent value={2}>
            <StepSelectVendors form={form} />
          </StepperContent>
          <StepperContent value={3}>
            <StepSelectItems form={form} />
          </StepperContent>
          <StepperContent value={4}>
            <StepSummary form={form} onEditStep={handleEditStep} />
          </StepperContent>
        </StepperPanel>
      </Stepper>

      <footer className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky bottom-0 -mx-3 -mb-3 flex items-center justify-between border-t px-3 py-3 backdrop-blur">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={createPo.isPending}
          className="text-muted-foreground"
        >
          {tc("cancel")}
        </Button>
        <div className="flex gap-2">
          {step > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              disabled={createPo.isPending}
            >
              {tc("back")}
            </Button>
          )}
          {step < 4 && (
            <Button
              size="sm"
              onClick={handleNext}
              disabled={createPo.isPending || !isCurrentStepValid}
              className="bg-module-procurement"
            >
              {tc("next")}
              <ArrowRight aria-hidden="true" />
            </Button>
          )}
          {step === 4 && (
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={createPo.isPending}
              className="bg-module-procurement"
            >
              {createPo.isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <ClipboardCheck aria-hidden="true" />
              )}
              {tc("confirm")}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
