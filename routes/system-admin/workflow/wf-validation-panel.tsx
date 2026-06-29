
import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Info,
} from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ValidationIssue, IssueSeverity } from "./wf-validate";

interface WfValidationPanelProps {
  readonly issues: ValidationIssue[];
  readonly errorCount: number;
  readonly warningCount: number;
  readonly isReady: boolean;
  readonly onSelectStage?: (index: number) => void;
}

const SEVERITY_CONFIG: Record<
  IssueSeverity,
  {
    container: string;
    icon: typeof AlertCircle;
    iconClass: string;
    badgeVariant: "destructive" | "warning" | "secondary";
  }
> = {
  error: {
    container: "border-destructive/40 bg-destructive/5",
    icon: AlertCircle,
    iconClass: "text-destructive",
    badgeVariant: "destructive",
  },
  warning: {
    container: "border-warning/40 bg-warning/10",
    icon: AlertTriangle,
    iconClass: "text-warning-foreground",
    badgeVariant: "warning",
  },
  info: {
    container: "border-info/40 bg-info/10",
    icon: Info,
    iconClass: "text-info-foreground",
    badgeVariant: "secondary",
  },
};

export default function WfValidationPanel({
  issues,
  errorCount,
  warningCount,
  isReady,
  onSelectStage,
}: WfValidationPanelProps) {
  const t = useTranslations("systemAdmin.workflow");
  const [open, setOpen] = useState(false);

  const totalIssues = issues.length;

  if (totalIssues === 0) {
    return (
      <div
        role="status"
        className="border-success/40 bg-success/10 flex items-center gap-2 rounded border px-3 py-2"
      >
        <CheckCircle2 className="text-success-foreground size-4 shrink-0" />
        <p className="text-success-foreground text-xs font-semibold">
          {t("validationReady")}
        </p>
      </div>
    );
  }

  const headerContainer = isReady
    ? "border-warning/40 bg-warning/10"
    : "border-destructive/40 bg-destructive/5";
  const HeaderIcon = isReady ? AlertTriangle : AlertCircle;
  const headerIconClass = isReady
    ? "text-warning-foreground"
    : "text-destructive";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn("rounded border", headerContainer)}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-auto w-full items-center justify-between gap-2 px-3 py-2 hover:bg-transparent"
            aria-expanded={open}
          >
            <div className="flex min-w-0 items-center gap-2">
              <HeaderIcon
                className={cn("size-4 shrink-0", headerIconClass)}
                aria-hidden="true"
              />
              <p
                className={cn(
                  "text-xs font-semibold",
                  isReady ? "text-warning-foreground" : "text-destructive",
                )}
              >
                {t("validationIssuesFound", { count: totalIssues })}
              </p>
              <div className="flex items-center gap-1">
                {errorCount > 0 && (
                  <Badge
                    variant="destructive"
                    size="xs"
                    className="tabular-nums"
                  >
                    {errorCount} {t("issueErrorLabel")}
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge variant="warning" size="xs" className="tabular-nums">
                    {warningCount} {t("issueWarningLabel")}
                  </Badge>
                )}
              </div>
            </div>
            <ChevronDown
              className={cn(
                "text-muted-foreground size-3.5 shrink-0 transition-transform",
                open && "rotate-180",
              )}
              aria-hidden="true"
            />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <ul className="space-y-1 border-t border-current/10 px-3 py-2">
            {issues.map((issue, i) => {
              const config = SEVERITY_CONFIG[issue.severity];
              const Icon = config.icon;
              const clickable =
                typeof issue.stageIndex === "number" && onSelectStage;
              const content = (
                <div className="flex w-full items-start gap-2">
                  <Icon
                    className={cn("mt-0.5 size-3 shrink-0", config.iconClass)}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-xs leading-snug">
                      {t(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        issue.translationKey as any,
                        issue.translationValues as never,
                      )}
                    </p>
                    {issue.stageName && (
                      <p className="text-muted-foreground mt-0.5 text-[0.6875rem]">
                        {t("stageName")}: {issue.stageName}
                      </p>
                    )}
                  </div>
                </div>
              );

              return (
                <li key={`${issue.code}-${issue.stageIndex ?? "x"}-${i}`}>
                  {clickable ? (
                    <button
                      type="button"
                      onClick={() => onSelectStage(issue.stageIndex!)}
                      className="hover:bg-foreground/5 focus-visible:ring-ring w-full rounded px-1.5 py-1 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="px-1.5 py-1">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
