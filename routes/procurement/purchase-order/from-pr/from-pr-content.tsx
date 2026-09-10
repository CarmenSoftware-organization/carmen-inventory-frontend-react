import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { RowSelectionState } from "@tanstack/react-table";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/components/ui/stepper";
import { useBuCode } from "@/hooks/use-bu-code";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { useErrorToast } from "@/hooks/use-error-toast";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { useProfile } from "@/hooks/use-profile";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { GroupPrPo } from "@/types/purchase-order";
import { StepSelectPr } from "./step-select-pr";
import { StepReviewGroup } from "./step-review-group";

type Step = 1 | 2;

const LAST_STEP: Step = 2;

const STEPS: ReadonlyArray<{
  readonly step: Step;
  readonly labelKey: "stepSelectPr" | "stepReviewPo";
}> = [
  { step: 1, labelKey: "stepSelectPr" },
  { step: 2, labelKey: "stepReviewPo" },
];

const PO_LIST_PATH = "/procurement/purchase-order";
const COMPLETED_INDICATOR = <Check className="size-3" aria-hidden="true" />;

/**
 * สร้างใบสั่งซื้อจากใบขอซื้อ — หน้าเต็ม 2 ขั้น (ทรงเดียวกับ from-price-list)
 *
 * ของเดิมเป็น dialog ซ้อน dialog: กดสร้าง → เลือกวิธี → เปิด dialog อีกใบที่มี
 * ตารางเลือกใบขอซื้อกับตารางตรวจสอบอยู่ข้างใน ตารางกว้าง ๆ สองตารางในกล่องลอย
 * ที่ปิดแล้วของหายหมด
 *
 * งานจริงอยู่ที่หลังบ้านสองเส้น: `group` จัดกลุ่มใบขอซื้อให้ดูก่อน แล้ว `confirm`
 * ถึงจะสร้างจริง — หน้านี้ไม่มีฟอร์มของตัวเอง จึงไม่ต้องมี react-hook-form
 */
export function FromPrContent() {
  const navigate = useNavigate();
  const t = useTranslations("procurement.purchaseOrder");
  const tc = useTranslations("common");
  const tt = useTranslations("toast");
  const buCode = useBuCode();
  const { userId, data: profile } = useProfile();
  const queryClient = useQueryClient();
  const errorToast = useErrorToast();

  const [step, setStep] = useState<Step>(1);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [groupedData, setGroupedData] = useState<GroupPrPo[]>([]);
  const [workflowId, setWorkflowId] = useState("");
  const [isGrouping, setIsGrouping] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const isPending = isGrouping || isConfirming;
  const selectedPrIds = Object.keys(rowSelection).filter(
    (id) => rowSelection[id],
  );
  const selectedCount = selectedPrIds.length;

  // "มีของค้าง" = เลือกอะไรไปแล้วก็นับ ตั้งแต่ลำดับขั้นอนุมัติ ไม่ใช่รอจนติ๊กใบ —
  // ยังไม่ได้สร้างอะไร แต่ออกไปแล้วต้องมาไล่เลือกใหม่ทั้งหมด
  const isDirty = (!!workflowId || selectedCount > 0) && !isConfirming;

  const discard = useDiscardConfirm({ isDirty, isPending });
  // ปุ่มยกเลิกกับลูกศรย้อนกลับเรียก navigate() ตรง ๆ ซึ่ง useNavigationGuard
  // ดักไม่ได้ (ดักแค่คลิกลิงก์กับปุ่ม Back ของเบราว์เซอร์)
  const handleCancel = () => discard.confirm(() => navigate(PO_LIST_PATH));
  const navGuard = useNavigationGuard(isDirty && !isPending);

  const handleBack = () => setStep(1);

  const handleNext = async () => {
    if (selectedCount === 0 || !buCode) return;

    setIsGrouping(true);
    try {
      const res = await httpClient.post(
        API_ENDPOINTS.PURCHASE_ORDER_GROUP_PR(buCode),
        { pr_ids: selectedPrIds },
      );
      if (!res.ok) throw await ApiError.from(res, "Failed to group PRs");
      const json = await res.json();
      setGroupedData(json.data.groups);
      setStep(2);
    } catch (err) {
      errorToast(err);
    } finally {
      setIsGrouping(false);
    }
  };

  const handleStepChange = (value: number) => {
    if (isPending) return;
    // ถอยกลับได้เสมอ ส่วนเดินหน้าต้องผ่าน handleNext เพราะขั้นที่ 2 ต้องรอ
    // ผลจัดกลุ่มจากหลังบ้านก่อน
    if (value <= step) setStep(Math.max(1, value) as Step);
  };

  const handleConfirm = async () => {
    if (selectedCount === 0 || !buCode) return;

    setIsConfirming(true);
    try {
      const buyerName = [
        profile?.user_info.firstname,
        profile?.user_info.lastname,
      ]
        .filter(Boolean)
        .join(" ");
      const res = await httpClient.post(
        API_ENDPOINTS.PURCHASE_ORDER_CONFIRM_PR(buCode),
        {
          workflow_id: workflowId,
          pr_ids: selectedPrIds,
          buyer_id: userId,
          buyer_name: buyerName,
        },
      );
      if (!res.ok) throw await ApiError.from(res, "Failed to confirm PRs");
      await res.json();
      toast.success(tt("createSuccess", { entity: t("entity") }));
      await queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PURCHASE_ORDERS],
      });
      navigate(PO_LIST_PATH);
    } catch (err) {
      errorToast(err);
      setIsConfirming(false);
    }
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
        <div className="min-w-0 flex-1 space-y-0.5">
          <h1 className="text-foreground text-lg font-semibold tracking-tight">
            {t("fromPr")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("fromPrDesc")}</p>
        </div>
        {selectedCount > 0 && (
          <Badge className="mt-0.5 shrink-0 tabular-nums">
            {t("nSelected", { count: selectedCount })}
          </Badge>
        )}
      </header>

      <Stepper
        value={step}
        onValueChange={handleStepChange}
        indicators={{ completed: COMPLETED_INDICATOR }}
      >
        {/* แถบขั้นตอนกว้างเท่าที่มันต้องใช้ ไม่กางเต็มจอ — StepperNav บังคับ
            w-full ของตัวเองไว้ด้วย data-variant ซึ่งชนะ class ที่ส่งเข้าไป
            เลยต้องคุมความกว้างจากกล่องข้างนอกแทน · max-w-full กันจอแคบล้น */}
        <div className="mx-auto w-96 max-w-full">
          <StepperNav>
            {STEPS.map(({ step: s, labelKey }, i, arr) => (
              <StepperItem key={s} step={s}>
                <StepperTrigger className="flex-col gap-1">
                  <StepperIndicator>{s}</StepperIndicator>
                  <StepperTitle className="text-micro-legal font-semibold">
                    {t(labelKey)}
                  </StepperTitle>
                </StepperTrigger>
                {i < arr.length - 1 && (
                  <StepperSeparator className="group-data-[state=completed]/step:bg-primary" />
                )}
              </StepperItem>
            ))}
          </StepperNav>
        </div>
        <StepperPanel className="mt-4">
          <StepperContent value={1}>
            <StepSelectPr
              workflowId={workflowId}
              onWorkflowChange={setWorkflowId}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              disabled={isGrouping}
            />
          </StepperContent>
          <StepperContent value={2}>
            <StepReviewGroup data={groupedData} />
          </StepperContent>
        </StepperPanel>
      </Stepper>

      <footer className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky bottom-0 flex items-center justify-between px-8 py-3 backdrop-blur">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancel}
          disabled={isPending}
        >
          {tc("cancel")}
        </Button>
        <div className="flex gap-2">
          {step > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              disabled={isPending}
            >
              {tc("back")}
            </Button>
          )}
          {step < LAST_STEP && (
            <Button
              size="sm"
              onClick={handleNext}
              disabled={selectedCount === 0 || !workflowId || isGrouping}
            >
              {isGrouping ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight aria-hidden="true" />
              )}
              {tc("next")}
            </Button>
          )}
          {step === LAST_STEP && (
            <Button size="sm" onClick={handleConfirm} disabled={isConfirming}>
              {isConfirming ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <ClipboardCheck aria-hidden="true" />
              )}
              {tc("confirm")}
            </Button>
          )}
        </div>
      </footer>

      <DiscardDialog {...discard.dialogProps} variant="warning" />

      {/* ตัวเดียวกันแต่คนละต้นทาง — อันนี้ของคลิกลิงก์ใน sidebar กับปุ่ม Back
          ของเบราว์เซอร์ ซึ่ง useNavigationGuard ดักไว้ให้ */}
      <DiscardDialog
        open={navGuard.isOpen}
        onOpenChange={(o) => {
          if (!o) navGuard.cancel();
        }}
        onConfirm={navGuard.confirm}
        onCancel={navGuard.cancel}
        variant="warning"
      />
    </div>
  );
}
