import { type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DocFormHeaderProps {
  readonly title: string;
  /** บรรทัดย่อยใต้ title (เช่น document version) */
  readonly subtitle?: ReactNode;
  readonly backLabel: string;
  readonly onBack: () => void;
  readonly badges?: ReactNode;
  readonly actions?: ReactNode;
  readonly ribbon?: ReactNode;
  readonly workflowStep?: ReactNode;
}

export function DocFormHeader({
  title,
  subtitle,
  backLabel,
  onBack,
  badges,
  actions,
  ribbon,
  workflowStep,
}: DocFormHeaderProps) {
  return (
    <div>
      {/* ── Title row ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          aria-label={backLabel}
        >
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {title}
            </h1>
            {badges}
          </div>
          {subtitle && (
            <div className="text-muted-foreground mt-0.5 text-xs">
              {subtitle}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>

      {/* ── Document info ribbon ── */}
      {ribbon && (
        <div className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">{ribbon}</div>
            {workflowStep}
          </div>
        </div>
      )}
    </div>
  );
}

export function DocumentRibbon({ children }: { readonly children: ReactNode }) {
  return <div className="flex flex-wrap items-stretch">{children}</div>;
}

export function RibbonCell({
  label,
  children,
  className,
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={cn("min-w-0 px-4", className)}>
      <p className="text-muted-foreground text-[0.625rem] font-semibold tracking-wider uppercase">
        {label}
      </p>
      <div className="mt-0.5 truncate text-sm font-semibold">{children}</div>
    </div>
  );
}
