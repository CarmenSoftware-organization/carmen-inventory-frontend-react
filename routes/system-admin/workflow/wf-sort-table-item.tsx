import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertCircle,
  CheckCircle2,
  Crown,
  GripVertical,
  Users,
  Trash2,
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
  readonly onDelete?: () => void;
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
  onDelete,
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
        "group focus-within:ring-ring relative flex items-center gap-2 rounded-xl border p-1 text-sm transition-all duration-200 ease-out focus-within:ring-2",
        isSelected
          ? "border-primary/30 bg-primary/5 ring-primary/20 text-primary-foreground shadow-sm ring-1"
          : "border-border hover:bg-muted/50 hover:border-border/80 text-muted-foreground hover:text-foreground",
        isDragging &&
          "bg-background ring-border z-50 scale-[0.98] cursor-grabbing opacity-80 shadow-lg ring-1",
      )}
    >
      {isSelected && (
        <div className="bg-primary absolute inset-y-0 left-0 w-1 rounded-l-lg" />
      )}
      {isDragDisabled ? (
        <span className="w-4 shrink-0" />
      ) : (
        <button
          type="button"
          className={cn(
            "cursor-grab touch-none transition-colors",
            isSelected
              ? "text-primary/70 hover:text-primary"
              : "text-muted-foreground/50 hover:text-foreground",
            isDragging && "text-foreground cursor-grabbing",
          )}
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      )}
      <button
        type="button"
        className={cn(
          "flex min-w-0 flex-1 cursor-pointer items-center gap-3 bg-transparent text-left transition-colors",
          isSelected ? "text-foreground font-medium" : "text-foreground",
        )}
        onClick={onClick}
      >
        {isLast ? (
          <CheckCircle2
            className={cn(
              "size-3.5 shrink-0",
              isSelected ? "text-primary" : "text-muted-foreground",
            )}
          />
        ) : (
          <span
            className={cn(
              "text-micro-legal flex size-5 shrink-0 items-center justify-center rounded-full font-semibold transition-colors",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground group-hover:bg-background group-hover:text-foreground group-hover:ring-border group-hover:shadow-sm group-hover:ring-1",
            )}
          >
            {index + 1}
          </span>
        )}
        <span className="flex-1 truncate">{name}</span>
        {!isLast && (
          <span className="flex shrink-0 items-center gap-1.5 text-sm">
            {hasWarning && (
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex animate-pulse"
                    aria-label={t("warningNoUsers")}
                  >
                    <AlertCircle className="text-destructive size-4" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-sm">
                  {t("warningNoUsers")}
                </TooltipContent>
              </Tooltip>
            )}
            {isHod ? (
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <span
                    className="text-warning-ink inline-flex items-center transition-transform hover:scale-110"
                    aria-label={t("isHod")}
                  >
                    <Crown className="size-3.5 drop-shadow-sm" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-sm">
                  {t("isHod")}
                </TooltipContent>
              </Tooltip>
            ) : (
              userCount > 0 && (
                <span
                  className={cn(
                    "text-micro-legal inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium tabular-nums transition-colors",
                    isSelected
                      ? "bg-primary/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground group-hover:bg-background group-hover:text-foreground group-hover:shadow-sm",
                  )}
                >
                  <Users className="size-3" aria-hidden="true" />
                  {userCount}
                </span>
              )
            )}
          </span>
        )}
      </button>

      {onDelete && !isDragDisabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={cn(
            "flex shrink-0 cursor-pointer items-center justify-center rounded p-1.5 transition-all duration-200",
            isSelected
              ? "text-destructive hover:bg-destructive/10"
              : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
          )}
          aria-label={t("deleteTitle")}
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}
