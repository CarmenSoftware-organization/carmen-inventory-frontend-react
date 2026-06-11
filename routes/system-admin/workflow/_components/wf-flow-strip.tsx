import { CheckCircle2, Crown, Play } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Role, Stage, WorkflowDto } from "@/types/workflows";
import { cn } from "@/lib/utils";
import { ROLE_SOLID } from "./wf-role-colors";

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
          <span className="text-[0.625rem] font-medium tabular-nums">
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
  const dotClass =
    kind === "start"
      ? "bg-primary/15 text-primary ring-primary/30"
      : kind === "end"
        ? "bg-success/15 text-success-foreground ring-success/30"
        : "bg-muted-foreground/10 ring-muted-foreground/20";

  const roleBg = kind === "middle" && role ? ROLE_SOLID[role] : undefined;

  const node = (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full ring-1",
        kind === "middle" ? "size-2.5" : "size-4",
        dotClass,
      )}
      aria-label={ariaLabel}
    >
      {kind === "start" && (
        <Play className="size-2 fill-current" aria-hidden="true" />
      )}
      {kind === "end" && (
        <CheckCircle2 className="size-2.5" aria-hidden="true" />
      )}
      {kind === "middle" && roleBg && (
        <span
          className={cn("inline-block size-1.5 rounded-full", roleBg)}
          aria-hidden="true"
        />
      )}
      {isHod && kind === "middle" && (
        <span className="bg-warning text-warning-foreground absolute -top-1 -right-1 inline-flex size-2.5 items-center justify-center rounded-full">
          <Crown className="size-1.5" aria-hidden="true" />
        </span>
      )}
    </span>
  );

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{node}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
