import { CheckCircle2, Circle, Crown, Play } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Role, Stage, WorkflowDto } from "@/types/workflows";
import { cn } from "@/lib/utils";
import { ROLE_ICON } from "./wf-role-colors";

interface WfFlowStripProps {
  readonly workflow: WorkflowDto;
  readonly className?: string;
}

const MAX_VISIBLE_MIDDLE = 5;

export default function WfFlowStrip({ workflow, className }: WfFlowStripProps) {
  const stagesArray: Stage[] | undefined = workflow.data?.stages;
  const stagesCount = stagesArray?.length ?? workflow.stages ?? 0;
  const safeCount = Math.max(2, stagesCount);
  const middleCount = Math.max(0, safeCount - 2);
  const visibleMiddle = Math.min(middleCount, MAX_VISIBLE_MIDDLE);
  const overflow = middleCount - visibleMiddle;

  const middleStages: (Stage | null)[] = stagesArray
    ? stagesArray.slice(1, -1).slice(0, MAX_VISIBLE_MIDDLE)
    : Array.from({ length: visibleMiddle }, () => null);

  const startStage: Stage | null = stagesArray?.[0] ?? null;
  const endStage: Stage | null = stagesArray
    ? (stagesArray[stagesArray.length - 1] ?? null)
    : null;

  return (
    <div
      className={cn(
        "text-muted-foreground flex items-center gap-0.5",
        className,
      )}
      aria-label={`Workflow with ${safeCount} stages`}
    >
      <FlowNode
        label={startStage?.name ?? "Start"}
        ariaLabel="Start"
        kind="start"
      />

      {middleStages.map((stage, i) => (
        <span key={i} className="flex items-center gap-0.5">
          <span className="bg-border h-px w-1.5" aria-hidden="true" />
          <FlowNode
            label={stage?.name ?? `Stage ${i + 1}`}
            ariaLabel={stage?.name ?? `Stage ${i + 1}`}
            kind="middle"
            role={stage?.role}
            isHod={stage?.is_hod}
          />
        </span>
      ))}

      {overflow > 0 && (
        <span className="flex items-center gap-0.5">
          <span className="bg-border h-px w-1.5" aria-hidden="true" />
          <span className="text-xs font-semibold tabular-nums">
            +{overflow}
          </span>
        </span>
      )}

      <span className="bg-border h-px w-1.5" aria-hidden="true" />
      <FlowNode
        label={endStage?.name ?? "Completed"}
        ariaLabel="Completed"
        kind="end"
      />
    </div>
  );
}

interface FlowNodeProps {
  readonly label: string;
  readonly ariaLabel: string;
  readonly kind: "start" | "middle" | "end";
  readonly role?: Role;
  readonly isHod?: boolean;
}

function FlowNode({ label, ariaLabel, kind, role, isHod }: FlowNodeProps) {
  // แต่ละโหนดแยกกันด้วย "รูปร่าง" ของไอคอน ไม่ใช่สี — strip นี้เป็นแผนผังของ
  // นิยาม workflow ไม่มีโหนดไหน "กำลังทำงาน" อยู่ จึงไม่มีอะไรควรได้ accent
  // ยกเว้นมงกุฎ HOD ที่ใช้สีชุดเดียวกับในฟอร์ม (wf-sort-table-item) เพราะมันคือ
  // ป้ายบอกสถานะพิเศษของ stage ไม่ใช่การแยกหมวด และต้องหาเจอตอนกวาดตาทั้งคอลัมน์
  //
  // stage ที่เป็น HOD ใช้มงกุฎ**แทน**ไอคอน role ไปเลย ไม่ใช่แปะทับมุม — ที่ขนาด
  // 16px ในเซลล์ตาราง สองสัญลักษณ์ซ้อนกันอ่านเป็นก้อนเดียว (role ยังอยู่ในฟอร์ม)
  const isHodNode = kind === "middle" && !!isHod;
  const Icon = isHodNode
    ? Crown
    : kind === "start"
      ? Play
      : kind === "end"
        ? CheckCircle2
        : role
          ? ROLE_ICON[role]
          : Circle;

  const node = (
    <span
      className={cn(
        "inline-flex shrink-0",
        isHodNode ? "text-warning-ink" : "text-muted-foreground",
      )}
      aria-label={ariaLabel}
    >
      <Icon
        className={cn("size-4", kind === "start" && "fill-current")}
        aria-hidden="true"
      />
    </span>
  );

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{node}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}
        {isHodNode && " · HOD"}
      </TooltipContent>
    </Tooltip>
  );
}
