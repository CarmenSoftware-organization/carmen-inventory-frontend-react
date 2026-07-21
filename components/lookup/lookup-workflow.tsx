import { useState } from "react";
import { CircleAlert } from "lucide-react";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";
import { FieldPlainText } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useWorkflowTypeQuery } from "@/hooks/use-workflow";
import { WORKFLOW_TYPE } from "@/types/workflows";

interface LookupWorkflowProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly workflowType: WORKFLOW_TYPE;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm" | "default";
  readonly error?: string;
  readonly readOnly?: boolean;
}

export function LookupWorkflow({
  value,
  onValueChange,
  workflowType,
  disabled,
  placeholder,
  className,
  size = "sm",
  error,
  readOnly,
}: LookupWorkflowProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [selectOpen, setSelectOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const { data: workflows } = useWorkflowTypeQuery(workflowType);
  const resolvedPlaceholder =
    placeholder ?? tl("select", { entity: tfl("workflow") });
  const selectedLabel = workflows?.find((wf) => wf.id === value)?.name;
  const showErrorTooltip = !!error && !selectOpen;
  const showTooltip = !error && !selectOpen && !!selectedLabel;

  // FieldPlainText (ไม่ใช่ <span> เปล่า) เพราะ `Field` จะมุด label ให้ก็ต่อเมื่อ
  // เจอ data-slot="field-plain-text" เป็น direct child — และมันแสดง "—" เองอยู่แล้ว
  if (readOnly) {
    return (
      <FieldPlainText className={className}>{selectedLabel}</FieldPlainText>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip
        open={(showErrorTooltip || showTooltip) && tooltipOpen}
        onOpenChange={setTooltipOpen}
      >
        <TooltipTrigger asChild>
          <div className="relative">
            <Select
              value={value}
              onValueChange={onValueChange}
              disabled={disabled}
              onOpenChange={setSelectOpen}
            >
              <SelectTrigger
                aria-invalid={!!error}
                size={size}
                className={cn(
                  className ?? "w-full text-xs",
                  error && "border-destructive pr-7",
                )}
              >
                <SelectValue placeholder={resolvedPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {workflows?.map((wf) => (
                  <SelectItem key={wf.id} value={wf.id} className="text-xs">
                    {wf.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!!error && (
              <div className="pointer-events-none absolute inset-x-0 top-0 flex h-8 items-center justify-end pr-2">
                <CircleAlert
                  className="text-destructive size-4"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
        </TooltipTrigger>
        {showErrorTooltip && (
          <TooltipContent
            side="top"
            align="end"
            className="bg-background text-destructive [&>svg]:fill-background [&>svg]:text-border border px-3 py-2 text-xs font-semibold"
          >
            {error}
          </TooltipContent>
        )}
        {showTooltip && (
          <TooltipContent
            side="top"
            className="bg-popover text-popover-foreground [&>svg]:fill-popover [&>svg]:text-border rounded-lg border px-3 py-2 shadow-md"
          >
            <p className="text-xs font-semibold">{selectedLabel}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
