import { Clock, GitBranch, ListChecks, Lock } from "lucide-react";
import { useLocale } from "use-intl";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { WorkflowDto } from "@/types/workflows";
import { formatRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import WfFlowStrip from "./wf-flow-strip";
import WfRowActions from "./wf-row-actions";

interface WfCardProps {
  readonly item: WorkflowDto;
  readonly index?: number;
  readonly onEdit: (item: WorkflowDto) => void;
  readonly onToggleActive?: (item: WorkflowDto) => void;
  readonly onDuplicate?: (item: WorkflowDto) => void;
  readonly onDelete?: (item: WorkflowDto) => void;
  readonly isPending?: boolean;
}

export default function WfCard({
  item,
  index,
  onEdit,
  onToggleActive,
  onDuplicate,
  onDelete,
  isPending,
}: WfCardProps) {
  const locale = useLocale();
  const updated = item.audit?.updated;
  const updatedRelative = updated?.at
    ? formatRelativeTime(updated.at, locale)
    : null;
  const inactive = !item.is_active;

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-disabled={inactive || undefined}
      onClick={() => onEdit(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit(item);
        }
      }}
      className={cn(
        "hover:border-primary/30 focus-visible:ring-ring cursor-pointer gap-0 py-0 transition-all hover:shadow-md focus-visible:ring-2",
        inactive && "bg-muted/30 border-dashed opacity-70 hover:opacity-100",
      )}
    >
      <CardHeader className="px-2.5 py-2">
        <div className="flex items-start gap-2">
          {typeof index === "number" && (
            <span className="bg-muted text-muted-foreground mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle
              className={cn(
                "flex items-center gap-1.5 truncate text-sm",
                inactive && "text-muted-foreground",
              )}
            >
              {inactive && (
                <Lock
                  className="text-muted-foreground size-3 shrink-0"
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  "truncate",
                  inactive && "decoration-muted-foreground/40 line-through",
                )}
              >
                {item.name || "..."}
              </span>
            </CardTitle>
            <p className="text-muted-foreground text-xs">
              {item.workflow_type}
            </p>
          </div>
        </div>
        <CardAction>
          <div className="flex items-center gap-1">
            <Badge
              variant={item.is_active ? "success" : "destructive"}
              size="sm"
              className="text-xs"
            >
              {item.is_active ? "Active" : "Inactive"}
            </Badge>
            {onToggleActive && onDuplicate && onDelete && (
              <WfRowActions
                workflow={item}
                onToggleActive={onToggleActive}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                isPending={isPending}
              />
            )}
          </div>
        </CardAction>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-1.5 px-2.5 py-2 text-xs">
        <div className="flex items-center justify-between gap-3">
          <WfFlowStrip workflow={item} />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <GitBranch
                className="text-muted-foreground size-3"
                aria-hidden="true"
              />
              <span className="text-muted-foreground tabular-nums">
                {item.stages}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <ListChecks
                className="text-muted-foreground size-3"
                aria-hidden="true"
              />
              <span className="text-muted-foreground tabular-nums">
                {item.rules}
              </span>
            </div>
          </div>
        </div>
        {updatedRelative && (
          <div className="text-muted-foreground flex items-center gap-1 text-[0.6875rem]">
            <Clock className="size-2.5" aria-hidden="true" />
            <span>{updatedRelative}</span>
            {updated?.name && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{updated.name}</span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
