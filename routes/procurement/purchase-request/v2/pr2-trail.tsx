import { Ban, ChevronRight } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
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
 * ไม่มีสี ไม่มีวงกลม — แยกสถานะด้วยน้ำหนัก/ความสว่างของตัวอักษรอย่างเดียว
 *
 * ของเดิมเป็น stepper: วงกลมทึบ + ไอคอน + ข้อความสองบรรทัดต่อขั้น กินความสูง
 * ~56px เพื่อบอกเรื่องเดียวคือ "ตอนนี้อยู่ขั้นไหน" ซึ่งเป็นข้อมูลประกอบ ไม่ใช่งานหลัก
 * ของหน้านี้ · แบบ breadcrumb บรรทัดเดียวบอกเท่ากันด้วยความสูง ~28px
 *
 * ปฏิเสธเป็นสถานะเดียวที่คงสีไว้ (destructive) พร้อมไอคอนกำกับ เพราะมันเปลี่ยน
 * ผลลัพธ์ของทั้งใบ ไม่ใช่แค่บอกว่าเดินไปถึงไหน — และสีอย่างเดียวไม่ผ่าน a11y
 */
const STATE_TEXT: Record<TrailState, string> = {
  done: "text-muted-foreground",
  current: "text-foreground font-semibold",
  pending: "text-muted-foreground/60",
  rejected: "text-destructive font-medium",
};

/**
 * สามขั้นเท่านั้น: ก่อนหน้า → ปัจจุบัน → ถัดไป (เหมือนหน้าเดิม `WorkflowStep`)
 *
 * เคยไล่ทุกขั้นจากประวัติทั้งเส้น แล้วมันยาวจนต้องเลื่อนแนวนอนในใบที่ผ่านมาหลายมือ
 * ทั้งที่คนอ่านต้องการรู้แค่ "มาจากใคร ตอนนี้ถึงใคร ต่อไปใคร" — ประวัติเต็มมีปุ่ม
 * เปิดดูอยู่แล้วทางขวา
 *
 * ชื่อขั้นมาจาก field ของเอกสารตรงๆ ส่วนใคร/เมื่อไหร่ของขั้นก่อนหน้าไปหยิบจาก
 * ประวัติรายการล่าสุดที่เกิดขึ้นที่ขั้นนั้น (หน้าเดิมไม่แสดงส่วนนี้)
 */
function buildSteps(pr: PurchaseRequest | undefined): TrailStep[] {
  if (!pr?.workflow_current_stage) return [];
  const history = pr.workflow_history ?? [];
  const steps: TrailStep[] = [];

  const prev = pr.workflow_previous_stage;
  if (prev && prev !== "-") {
    const last = [...history]
      .reverse()
      .find((h) => (h.current_stage || h.next_stage) === prev);
    steps.push({
      key: "prev",
      stage: prev,
      who: last?.user?.name,
      at: last?.datetime,
      state: last?.action?.toLowerCase().includes("reject")
        ? "rejected"
        : "done",
    });
  }

  steps.push({
    key: "current",
    stage: pr.workflow_current_stage,
    state: "current",
  });

  // จบแล้ว/ยกเลิกแล้วไม่มีขั้นถัดไป (เงื่อนไขเดียวกับ `pr-header.tsx`)
  if (
    pr.workflow_next_stage &&
    pr.workflow_next_stage !== "-" &&
    pr.pr_status !== PR_STATUS.COMPLETED &&
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
    <div className="border-border flex items-center gap-1.5 overflow-x-auto border-b px-4 py-1 text-xs">
      {steps.map((step, i) => {
        const meta =
          step.state === "current"
            ? tv2("yourTurn")
            : step.state === "pending"
              ? tv2("waiting")
              : [step.who, step.at ? formatDate(step.at, dateFormat) : null]
                  .filter(Boolean)
                  .join(" ");
        return (
          <div key={step.key} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && (
              <ChevronRight
                className="text-muted-foreground/60 size-3.5 shrink-0"
                aria-hidden
              />
            )}
            {step.state === "rejected" && (
              <Ban className="size-3 shrink-0" aria-hidden />
            )}
            {/* ชื่อขั้นบน คนที่ทำ/สถานะล่าง — คนละเรื่องกัน อ่านต่อกันบรรทัดเดียว
                แล้วสมองต้องแยกเองว่าตรงไหนจบ · กว้างตามเนื้อหาแต่ไม่เกิน 5rem
                ยาวเกินก็ตัดท้าย (ชื่อคนยาวไม่ควรดันขั้นถัดไปหลุดจอ) */}
            <div className="flex min-w-0 max-w-20 flex-col leading-tight">
              <span className={`truncate ${STATE_TEXT[step.state]}`}>
                {step.stage}
              </span>
              {meta && (
                <span className="text-muted-foreground/70 truncate text-micro">
                  {meta}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {onShowHistory && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="ml-auto shrink-0"
          onClick={onShowHistory}
        >
          {t("tabWorkflowHistory")}
        </Button>
      )}
    </div>
  );
}
