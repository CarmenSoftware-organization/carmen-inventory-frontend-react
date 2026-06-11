
import { Ban, Check, ChevronRight } from "lucide-react";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";

interface WorkflowStepProps {
  readonly previousStage?: string;
  readonly currentStage: string;
  readonly nextStage?: string;
  /**
   * Marks the workflow as terminated — no forward motion is possible.
   * - `"voided"`: current stage rendered as red Ban (no animation), next hidden.
   *   Previous stages still show as success-green to preserve the journey.
   * Extend with `"completed"` etc. when those flows need bespoke visuals.
   */
  readonly terminalState?: "voided";
}

/**
 * Stepper แสดงขั้นตอน workflow
 *
 * Render stepper แนวนอน 3 ขั้น previous → current → next โดยขั้น previous
 * มีเครื่องหมาย check สีเขียว, current ไฮไลต์ด้วย ring สี info, next เป็น
 * วงกลม dashed กรอง stage ที่เป็น undefined หรือ "-" ออกและคืน null ถ้า
 * ไม่มี stage เลย รองรับการเลื่อนแนวนอนเมื่อเกินจอ
 *
 * ถ้า `terminalState === "voided"` จะซ่อน nextStage และเปลี่ยน current เป็น
 * วงกลมแดงไอคอน Ban (ไม่มี ping animation) เพื่อสื่อว่าเอกสารถูกยกเลิกแล้ว
 *
 * @param props - props ของ component
 * @param props.previousStage - ชื่อ stage ก่อนหน้า (optional)
 * @param props.currentStage - ชื่อ stage ปัจจุบัน (required)
 * @param props.nextStage - ชื่อ stage ถัดไป (optional, "-" = ไม่มี)
 * @param props.terminalState - state ที่ปิดเส้นทาง forward เช่น "voided"
 * @returns JSX element ของ stepper หรือ null
 * @example
 * ```tsx
 * <WorkflowStep previousStage="Draft" currentStage="Review" nextStage="Approved" />
 * <WorkflowStep currentStage="Review" terminalState="voided" />
 * ```
 */
export function WorkflowStep({
  previousStage,
  currentStage,
  nextStage,
  terminalState,
}: WorkflowStepProps) {
  const t = useTranslations("common");
  const isVoided = terminalState === "voided";
  const resolvedNext =
    isVoided || nextStage === "-" ? undefined : nextStage;
  const stages = [previousStage, currentStage, resolvedNext].filter(
    (s): s is string => !!s,
  );

  if (stages.length === 0) return null;

  const currentIndex = stages.indexOf(currentStage);

  return (
    <div className="flex items-center gap-1 overflow-x-auto pt-4">
      {stages.map((stage, i) => {
        const isPrevious = i < currentIndex;
        const isCurrent = i === currentIndex;

        const currentIsVoided = isCurrent && isVoided;

        let stepLabel = t("stepNext");
        if (isPrevious) stepLabel = t("stepPrevious");
        else if (currentIsVoided) stepLabel = t("stepVoided");
        else if (isCurrent) stepLabel = t("stepCurrent");

        return (
          <div
            key={`${i}-${stage}`}
            className="flex shrink-0 items-center gap-1"
          >
            {i > 0 && (
              <ChevronRight className="text-muted-foreground mb-3 size-3.5 shrink-0" />
            )}
            <div className="flex w-20 flex-col items-center gap-1">
              <span
                className={cn(
                  "max-w-full truncate text-[0.5625rem] leading-none uppercase tracking-wider",
                  isPrevious && "text-success-foreground/70",
                  currentIsVoided && "text-destructive font-bold",
                  isCurrent && !currentIsVoided && "text-info font-bold",
                  !isPrevious && !isCurrent && "text-muted-foreground/40",
                )}
              >
                {stepLabel}
              </span>
              <div className="relative flex items-center justify-center">
                {isCurrent && !currentIsVoided && (
                  <span
                    aria-hidden
                    className="bg-info/30 absolute size-7 animate-ping rounded-full"
                  />
                )}
                <div
                  className={cn(
                    "relative flex shrink-0 items-center justify-center rounded-full transition-all",
                    isPrevious && "bg-success size-5",
                    currentIsVoided &&
                      "bg-destructive ring-destructive/30 size-6 shadow-sm ring-4",
                    isCurrent &&
                      !currentIsVoided &&
                      "bg-info ring-info/40 size-6 shadow-sm shadow-info/40 ring-4",
                    !isPrevious &&
                      !isCurrent &&
                      "border-muted-foreground/40 size-5 border-2 border-dashed bg-transparent",
                  )}
                >
                  {isPrevious && <Check className="size-3 text-white" />}
                  {currentIsVoided && (
                    <Ban className="size-3.5 text-white" aria-hidden="true" />
                  )}
                  {isCurrent && !currentIsVoided && (
                    <span
                      aria-hidden
                      className="size-2 rounded-full bg-white"
                    />
                  )}
                </div>
              </div>
              <span
                title={stage}
                className={cn(
                  "max-w-full truncate text-[0.625rem]",
                  isPrevious && "text-success-foreground",
                  currentIsVoided &&
                    "text-destructive text-[0.6875rem] font-bold line-through",
                  isCurrent &&
                    !currentIsVoided &&
                    "text-info text-[0.6875rem] font-bold",
                  !isPrevious && !isCurrent && "text-muted-foreground/50",
                )}
              >
                {stage}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
