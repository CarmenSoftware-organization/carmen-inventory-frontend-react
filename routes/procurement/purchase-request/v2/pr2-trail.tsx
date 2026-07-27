import { Check, ChevronRight, Circle, Dot, X } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";
import { PR_STATUS, type PurchaseRequest } from "@/types/purchase-request";

type TrailState = "done" | "current" | "pending" | "rejected";

interface TrailStep {
  readonly key: string;
  readonly stage: string;
  readonly who?: string;
  readonly at?: string;
  readonly state: TrailState;
}

/**
 * ขั้นที่ผ่านแล้วกับขั้นปัจจุบันใช้ accent เดียวกัน (primary) แยกกันด้วย "ไอคอน"
 * ไม่ใช่ "สี" — เขียวสำหรับ done คือ accent ตัวที่สอง ซึ่ง DESIGN.md ห้าม
 * ขั้นปัจจุบันได้ ring บางๆ ไม่ใช่ ring หนาเรืองแสง
 * ปฏิเสธเป็น semantic จริง จึงคง destructive ไว้ (พื้นทึบ → ใช้ -foreground ได้)
 */
const STATE_STYLE: Record<TrailState, string> = {
  done: "bg-primary text-primary-foreground",
  current:
    "bg-primary text-primary-foreground ring-primary/25 ring-offset-background ring-2 ring-offset-2",
  pending: "bg-muted text-muted-foreground",
  rejected: "bg-destructive text-destructive-foreground",
};

/**
 * สร้างลำดับขั้นจากประวัติ workflow + stage ปัจจุบัน/ถัดไป
 *
 * ประวัติที่ backend ส่งมาเป็น "การกระทำที่เกิดไปแล้ว" (ใคร ทำอะไร เมื่อไหร่ ที่ stage
 * ไหน) ไม่มีข้อความประกอบระดับเอกสาร — ข้อความมีเฉพาะระดับรายการ จึงไม่โชว์ตรงนี้
 */
function buildSteps(pr: PurchaseRequest | undefined): TrailStep[] {
  if (!pr) return [];
  const history = pr.workflow_history ?? [];
  const steps: TrailStep[] = history.map((h, i) => ({
    key: `h-${i}-${h.datetime}`,
    stage: h.current_stage || h.next_stage || "",
    who: h.user?.name,
    at: h.datetime,
    state: h.action?.toLowerCase().includes("reject") ? "rejected" : "done",
  }));

  if (pr.pr_status !== PR_STATUS.COMPLETED && pr.workflow_current_stage) {
    steps.push({
      key: "current",
      stage: pr.workflow_current_stage,
      state: "current",
    });
  }
  if (
    pr.workflow_next_stage &&
    pr.workflow_next_stage !== "-" &&
    pr.pr_status !== PR_STATUS.VOIDED
  ) {
    steps.push({
      key: "next",
      stage: pr.workflow_next_stage,
      state: "pending",
    });
  }
  return steps;
}

/**
 * โซน 3 — เส้นทางอนุมัติ แสดงบนหน้าเลย ไม่ต้องกดเปิด
 *
 * หน้าเดิมยัดเรื่องนี้ไว้หลังปุ่ม "Tap to view full workflow history" ทั้งที่สำหรับคน
 * อนุมัติ "ใครอนุมัติมาก่อนหน้าเรา เมื่อไหร่" คือบริบทสำคัญที่สุดของหน้านี้
 */
export function Pr2Trail({
  purchaseRequest,
  onShowHistory,
  dateFormat,
}: {
  readonly purchaseRequest?: PurchaseRequest;
  readonly onShowHistory?: () => void;
  readonly dateFormat: string;
}) {
  const t = useTranslations("procurement.purchaseRequest");
  const tv2 = useTranslations("procurement.purchaseRequest.v2");
  const steps = buildSteps(purchaseRequest);

  if (steps.length === 0) return null;

  return (
    <div className="border-border bg-muted/20 flex items-center gap-1 overflow-x-auto border-b px-4 py-2">
      {steps.map((step, i) => (
        <div key={step.key} className="flex shrink-0 items-center gap-1">
          {i > 0 && (
            <ChevronRight
              className="text-muted-foreground/50 size-4 shrink-0"
              aria-hidden
            />
          )}
          <div className="flex items-center gap-2 px-1">
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full",
                STATE_STYLE[step.state],
              )}
              aria-hidden
            >
              {step.state === "done" && <Check className="size-3" strokeWidth={3} />}
              {step.state === "rejected" && <X className="size-3" strokeWidth={3} />}
              {step.state === "current" && <Dot className="size-4" />}
              {step.state === "pending" && <Circle className="size-2" />}
            </span>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-medium">{step.stage}</div>
              <div className="text-muted-foreground truncate text-xs">
                {step.state === "current"
                  ? tv2("yourTurn")
                  : step.state === "pending"
                    ? tv2("waiting")
                    : [step.who, step.at ? formatDate(step.at, dateFormat) : null]
                        .filter(Boolean)
                        .join(" · ")}
              </div>
            </div>
          </div>
        </div>
      ))}

      {onShowHistory && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto shrink-0"
          onClick={onShowHistory}
        >
          {t("tabWorkflowHistory")}
        </Button>
      )}
    </div>
  );
}
