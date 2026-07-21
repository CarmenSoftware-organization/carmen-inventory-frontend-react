import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Crown,
  GripVertical,
  Play,
  Users,
} from "lucide-react";
import { useTranslations } from "use-intl";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RoutingRule, Stage } from "@/types/workflows";
import { cn } from "@/lib/utils";
import { formatCycleTime, totalSlaMinutes } from "./wf-sla-utils";

interface WfDiagramProps {
  readonly stages: Stage[];
  readonly routingRules?: RoutingRule[];
  readonly selectedIndex?: number;
  readonly onSelectStage?: (index: number) => void;
  readonly onMoveStage?: (from: number, to: number) => void;
  readonly className?: string;
  readonly headerActions?: React.ReactNode;
  /** Node flow direction — "vertical" stacks stages top→bottom (default horizontal) */
  readonly orientation?: "horizontal" | "vertical";
}

interface StageNodeData extends Record<string, unknown> {
  readonly stage: Stage;
  readonly index: number;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly isSelected: boolean;
  readonly userCount: number;
  readonly isHod: boolean;
  readonly slaLabel: string;
  readonly canDrag: boolean;
  readonly isVertical: boolean;
}

function StageNode({ data }: NodeProps<Node<StageNodeData>>) {
  const t = useTranslations("systemAdmin.workflow");
  const {
    stage,
    isFirst,
    isLast,
    isSelected,
    userCount,
    isHod,
    slaLabel,
    canDrag,
    isVertical,
  } = data;

  // โหนดทุกตัวเป็นกลาง — สเต็ปแรก/สุดท้าย/กลาง แยกกันด้วยไอคอน (Play /
  // CheckCircle2 / เลขลำดับ) ส่วน accent สงวนไว้ให้โหนดที่เลือกอยู่ ซึ่งเป็น
  // state เดียวในผังนี้ที่ผู้ใช้ทำให้เกิดขึ้นเอง
  const containerClass = "border-border";
  const labelClass = "text-foreground";

  const renderStepIcon = () => {
    if (isLast) {
      return <CheckCircle2 className="text-muted-foreground size-3" />;
    }
    if (isFirst) {
      return <Play className="text-muted-foreground size-3 fill-current" />;
    }
    return (
      <span className="text-[0.6875rem] font-semibold tabular-nums">
        {data.index}
      </span>
    );
  };

  return (
    <div
      className={cn(
        "group bg-card relative flex w-44 flex-col gap-1 rounded-lg border-2 px-3 py-2 transition-colors",
        containerClass,
        isSelected &&
          "ring-primary ring-offset-background ring-2 ring-offset-2",
        canDrag && "hover:border-primary/40 cursor-grab active:cursor-grabbing",
      )}
    >
      {!isFirst && (
        <Handle
          type="target"
          position={isVertical ? Position.Top : Position.Left}
          className="border-background! bg-muted-foreground! size-2! border-2! opacity-0! transition-opacity group-hover:opacity-100!"
        />
      )}
      {!isLast && (
        <Handle
          type="source"
          position={isVertical ? Position.Bottom : Position.Right}
          className="border-background! bg-muted-foreground! size-2! border-2! opacity-0! transition-opacity group-hover:opacity-100!"
        />
      )}

      <div className="flex items-center gap-1.5">
        {canDrag && (
          <GripVertical
            className="text-muted-foreground size-3 shrink-0"
            aria-hidden="true"
          />
        )}
        <span
          className={cn(
            "inline-flex size-5 shrink-0 items-center justify-center rounded-full",
            containerClass,
          )}
        >
          {renderStepIcon()}
        </span>
        <span
          className={cn("flex-1 truncate text-xs font-semibold", labelClass)}
          title={stage.name}
        >
          {stage.name}
        </span>
        {isHod && !isLast && (
          <Crown
            className="text-muted-foreground size-3 shrink-0"
            aria-label={t("isHod")}
          />
        )}
      </div>

      {!isLast && (
        <div className="text-muted-foreground flex items-center gap-2 text-[0.625rem]">
          <span className="capitalize">{stage.role}</span>
          {userCount > 0 && !isHod && (
            <span className="inline-flex items-center gap-0.5 tabular-nums">
              <Users className="size-2.5" />
              {userCount}
            </span>
          )}
          {slaLabel && <span className="ml-auto tabular-nums">{slaLabel}</span>}
        </div>
      )}
    </div>
  );
}

const nodeTypes = { stage: StageNode };

const HORIZONTAL_GAP = 240;
const VERTICAL_BASE = 80;
const VERTICAL_GAP = 96;
const LG_BREAKPOINT = 1024;

/** True when viewport ≥ Tailwind's `lg` (1024px) — matches the wf-detail grid. */
function useIsLargeScreen() {
  const [isLarge, setIsLarge] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`);
    const onChange = () => setIsLarge(mql.matches);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isLarge;
}

function buildGraph(
  stages: Stage[],
  routingRules: RoutingRule[],
  selectedIndex: number | undefined,
  draggable: boolean,
  vertical: boolean,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = stages.map((stage, index) => {
    const isFirst = index === 0;
    const isLast = index === stages.length - 1;
    const userCount = stage.assigned_users?.length ?? 0;
    const isHod = stage.is_hod ?? false;
    const slaLabel =
      stage.sla && stage.sla !== "0"
        ? `${stage.sla}${stage.sla_unit?.[0] ?? "h"}`
        : "";

    const canDrag = draggable && !isFirst && !isLast;

    return {
      id: `stage-${index}`,
      type: "stage",
      position: vertical
        ? { x: 0, y: index * VERTICAL_GAP }
        : { x: index * HORIZONTAL_GAP, y: VERTICAL_BASE },
      data: {
        stage,
        index,
        isFirst,
        isLast,
        isSelected: selectedIndex === index,
        userCount,
        isHod,
        slaLabel,
        canDrag,
        isVertical: vertical,
      } satisfies StageNodeData,
      draggable: canDrag,
      selectable: true,
    };
  });

  const sequenceEdges: Edge[] = stages.slice(0, -1).map((_, index) => ({
    id: `seq-${index}`,
    source: `stage-${index}`,
    target: `stage-${index + 1}`,
    type: "smoothstep",
    animated: false,
    style: {
      stroke: "var(--border)",
      strokeOpacity: 0.9,
      strokeWidth: 1.5,
    },
  }));

  const routingEdges: Edge[] = routingRules
    .map((rule, ruleIdx): Edge | null => {
      if (!rule.trigger_stage || !rule.action?.parameters?.target_stage) {
        return null;
      }
      const triggerIdx = stages.findIndex((s) => s.name === rule.trigger_stage);
      const targetIdx = stages.findIndex(
        (s) => s.name === rule.action.parameters.target_stage,
      );
      if (triggerIdx < 0 || targetIdx < 0) return null;

      return {
        id: `rule-${ruleIdx}-${triggerIdx}-${targetIdx}`,
        source: `stage-${triggerIdx}`,
        target: `stage-${targetIdx}`,
        type: "smoothstep",
        animated: true,
        label: rule.name,
        style: {
          stroke: "var(--info)",
          strokeWidth: 1.5,
          strokeDasharray: "4 3",
        },
        labelStyle: {
          fill: "var(--info-foreground)",
          fontSize: 10,
          fontWeight: 500,
        },
        labelBgStyle: {
          fill: "var(--card)",
          fillOpacity: 0.9,
        },
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 4,
      };
    })
    .filter((e): e is Edge => e !== null);

  return { nodes, edges: [...sequenceEdges, ...routingEdges] };
}

export default function WfDiagram({
  stages,
  routingRules = [],
  selectedIndex,
  onSelectStage,
  onMoveStage,
  className,
  headerActions,
  orientation = "horizontal",
}: WfDiagramProps) {
  const t = useTranslations("systemAdmin.workflow");

  const isLargeScreen = useIsLargeScreen();
  // Responsive: caller asks for vertical (desktop left-rail layout); on smaller
  // screens the diagram is full-width above the form, so render horizontal.
  const vertical = orientation === "vertical" && isLargeScreen;
  // Drag (node reorder + canvas pan) is allowed only when editable — i.e. an
  // onMoveStage handler is supplied (edit mode). View mode is fully static.
  const editable = !!onMoveStage;
  const { nodes, edges } = buildGraph(
    stages,
    routingRules,
    selectedIndex,
    editable,
    vertical,
  );

  if (!stages || stages.length === 0) return null;

  const middleCount = Math.max(0, stages.length - 2);
  const totalMinutes = totalSlaMinutes(stages);
  const cycleTime = formatCycleTime(totalMinutes);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.6875rem]">
          <span className="inline-flex items-center gap-1 tabular-nums">
            <span className="text-foreground font-semibold">
              {stages.length}
            </span>
            {t("stages").toLowerCase()}
          </span>
          {middleCount > 0 && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Users className="size-3" aria-hidden="true" />
              {middleCount} {middleCount === 1 ? t("approver") : t("approvers")}
            </span>
          )}
          {cycleTime && (
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-help items-center gap-1 tabular-nums">
                  <Clock className="size-3" aria-hidden="true" />
                  {t("cycleTime")}:{" "}
                  <span className="font-semibold">{cycleTime}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {totalHours} {t("slaHours").toLowerCase()} (
                {totalMinutes.toLocaleString()} {t("slaMinutes").toLowerCase()})
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {headerActions && (
          <div className="flex shrink-0 items-center">{headerActions}</div>
        )}
      </div>

      <div
        className={cn(
          "bg-muted/20 w-full overflow-hidden rounded border",
          vertical ? "h-[32rem]" : "h-56",
        )}
      >
        <ReactFlowProvider>
          <ReactFlow
            key={vertical ? "vertical" : "horizontal"}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2, includeHiddenNodes: false }}
            minZoom={0.4}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={editable}
            panOnDrag={editable}
            nodesConnectable={false}
            edgesFocusable={false}
            onNodeClick={(_event, node) => {
              const idx = Number((node.data as StageNodeData).index);
              if (Number.isFinite(idx)) onSelectStage?.(idx);
            }}
            onNodeDragStop={(_event, node) => {
              if (!onMoveStage) return;
              const data = node.data as StageNodeData;
              const fromIndex = data.index;
              if (data.isFirst || data.isLast) return;

              const lastMovableIndex = stages.length - 2;
              const rawIndex = Math.round(
                vertical
                  ? node.position.y / VERTICAL_GAP
                  : node.position.x / HORIZONTAL_GAP,
              );
              const toIndex = Math.min(Math.max(rawIndex, 1), lastMovableIndex);

              if (toIndex !== fromIndex) {
                onMoveStage(fromIndex, toIndex);
              }
            }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={16}
              size={1}
              color="var(--border)"
            />
            <Controls
              showInteractive={false}
              className="border-border! bg-card! rounded-lg! border!"
            />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}
