
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PoWorkflowStepProps {
  readonly previousStage?: string;
  readonly currentStage: string;
  readonly nextStage?: string;
}

/**
 * Stepper แสดง workflow ของ PO
 * แสดง previous/current/next stage เป็น 3 จุดพร้อมเส้นเชื่อม
 * stage ก่อนหน้าขึ้นสีเขียวพร้อม check icon, stage ปัจจุบันขึ้นสีฟ้ามี ring
 *
 * @param props - props
 * @param props.previousStage - ชื่อ stage ก่อนหน้า (optional)
 * @param props.currentStage - ชื่อ stage ปัจจุบัน (required)
 * @param props.nextStage - ชื่อ stage ถัดไป (optional)
 * @returns React element ของ stepper workflow หรือ null ถ้าไม่มี stage เลย
 * @example
 * <PoWorkflowStep previousStage="Draft" currentStage="Review" nextStage="Approved" />
 */
export function PoWorkflowStep({
  previousStage,
  currentStage,
  nextStage,
}: PoWorkflowStepProps) {
  const stages = [previousStage, currentStage, nextStage].filter(
    (s): s is string => !!s,
  );

  if (stages.length === 0) return null;

  const currentIndex = stages.indexOf(currentStage);

  return (
    <div className="flex items-center gap-1 overflow-x-auto pt-4">
      {stages.map((stage, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;

        return (
          <div key={`${i}-${stage}`} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-medium text-white",
                  isCompleted && "bg-success",
                  isCurrent && "bg-info ring-2 ring-info/30",
                  !isCompleted &&
                    !isCurrent &&
                    "bg-muted text-muted-foreground",
                )}
              >
                {isCompleted ? <Check className="size-3" /> : i + 1}
              </div>
              <span
                className={cn(
                  "whitespace-nowrap text-xs",
                  isCompleted && "text-success-foreground",
                  isCurrent && "font-semibold text-info-foreground",
                  !isCompleted && !isCurrent && "text-muted-foreground",
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
