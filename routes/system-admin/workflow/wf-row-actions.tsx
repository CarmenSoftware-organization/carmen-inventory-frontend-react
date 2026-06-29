
import { Copy, MoreVertical, Power, PowerOff, Trash2 } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkflowDto } from "@/types/workflows";

interface WfRowActionsProps {
  readonly workflow: WorkflowDto;
  readonly onToggleActive: (workflow: WorkflowDto) => void;
  readonly onDuplicate: (workflow: WorkflowDto) => void;
  readonly onDelete: (workflow: WorkflowDto) => void;
  readonly isPending?: boolean;
}

export default function WfRowActions({
  workflow,
  onToggleActive,
  onDuplicate,
  onDelete,
  isPending,
}: WfRowActionsProps) {
  const t = useTranslations("systemAdmin.workflow");
  const tc = useTranslations("common");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={tc("rowActions")}
          disabled={isPending}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <MoreVertical className="size-3.5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem
          onClick={() => onToggleActive(workflow)}
          disabled={isPending}
        >
          {workflow.is_active ? (
            <>
              <PowerOff aria-hidden="true" />
              {t("deactivate")}
            </>
          ) : (
            <>
              <Power aria-hidden="true" />
              {t("activate")}
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDuplicate(workflow)}
          disabled={isPending}
        >
          <Copy aria-hidden="true" />
          {t("duplicate")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onDelete(workflow)}
          disabled={isPending}
        >
          <Trash2 aria-hidden="true" />
          {tc("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
