import type { ReactNode } from "react";
import { useTranslations } from "use-intl";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  readonly children: ReactNode;
  readonly onShowHistory?: () => void;
}

export function WorkflowStepButton({ children, onShowHistory }: Props) {
  const tc = useTranslations("common");

  if (!onShowHistory) return <>{children}</>;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onShowHistory}
            aria-label={tc("workflowHistoryHint")}
            className="hover:bg-muted/60 focus-visible:ring-ring -ml-1 w-fit cursor-pointer rounded-lg px-1 py-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent>{tc("workflowHistoryHint")}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
