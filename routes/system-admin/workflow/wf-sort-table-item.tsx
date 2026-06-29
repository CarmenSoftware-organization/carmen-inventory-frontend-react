import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertCircle,
  CheckCircle2,
  Crown,
  GripVertical,
  Users,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";

interface SortableStageItemProps {
  readonly id: string;
  readonly index: number;
  readonly name: string;
  readonly isSelected: boolean;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly onClick: () => void;
  readonly userCount?: number;
  readonly isHod?: boolean;
  readonly hasWarning?: boolean;
  /** Disable dragging outside edit mode (view mode) */
  readonly dragDisabled?: boolean;
}

export default function SortableStageItem({
  id,
  index,
  name,
  isSelected,
  isFirst,
  isLast,
  onClick,
  userCount = 0,
  isHod = false,
  hasWarning = false,
  dragDisabled = false,
}: SortableStageItemProps) {
  const t = useTranslations("systemAdmin.workflow");
  const isDragDisabled = isFirst || isLast || dragDisabled;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: isDragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "focus-within:ring-ring flex items-center gap-1.5 rounded border px-1.5 py-1 text-xs focus-within:ring-2",
        isSelected && "border-primary bg-primary/5",
        isDragging && "opacity-50",
      )}
    >
      {isDragDisabled ? (
        <span className="w-3" />
      ) : (
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-grab touch-none"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3" />
        </button>
      )}
      <button
        type="button"
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 bg-transparent text-left"
        onClick={onClick}
      >
        {isLast ? (
          <CheckCircle2 className="text-success-foreground size-3 shrink-0" />
        ) : (
          <span className="text-muted-foreground shrink-0 text-[0.625rem]">
            {index + 1}.
          </span>
        )}
        <span className="flex-1 truncate">{name}</span>
        {!isLast && (
          <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-[0.625rem]">
            {hasWarning && (
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex"
                    aria-label={t("warningNoUsers")}
                  >
                    <AlertCircle className="text-warning-foreground size-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {t("warningNoUsers")}
                </TooltipContent>
              </Tooltip>
            )}
            {isHod ? (
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <span
                    className="text-warning-foreground inline-flex items-center"
                    aria-label={t("isHod")}
                  >
                    <Crown className="size-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {t("isHod")}
                </TooltipContent>
              </Tooltip>
            ) : (
              userCount > 0 && (
                <span className="inline-flex items-center gap-0.5 tabular-nums">
                  <Users className="size-3" aria-hidden="true" />
                  {userCount}
                </span>
              )
            )}
          </span>
        )}
      </button>
    </div>
  );
}
