
import { Check, Gem, Hash, Shuffle } from "lucide-react";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";
import type { SpotCheckMethod } from "@/types/spot-check";

interface ScMethodPickerProps {
  readonly value: SpotCheckMethod | undefined;
  readonly onChange: (method: SpotCheckMethod) => void;
  readonly disabled: boolean;
}

export function ScMethodPicker({
  value,
  onChange,
  disabled,
}: ScMethodPickerProps) {
  const t = useTranslations("inventoryManagement.spotCheck");

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <MethodCard
        active={value === "random"}
        disabled={disabled}
        icon={Shuffle}
        title={t("methodRandom")}
        desc={t("methodRandomHint")}
        onClick={() => onChange("random")}
      />
      <MethodCard
        active={value === "high_value"}
        disabled={disabled}
        icon={Gem}
        title={t("methodHighValue")}
        desc={t("methodHighValueHint")}
        onClick={() => onChange("high_value")}
      />
      <MethodCard
        active={value === "manual"}
        disabled={disabled}
        icon={Hash}
        title={t("methodManual")}
        desc={t("methodManualHint")}
        onClick={() => onChange("manual")}
      />
    </div>
  );
}

interface MethodCardProps {
  readonly active: boolean;
  readonly disabled: boolean;
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly title: string;
  readonly desc: string;
  readonly onClick: () => void;
}

function MethodCard({
  active,
  disabled,
  icon: Icon,
  title,
  desc,
  onClick,
}: MethodCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group relative flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
        active
          ? "border-primary bg-primary/5"
          : "bg-card hover:border-primary/40 hover:bg-muted/30",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
          active
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "text-xs font-semibold tracking-tight transition-colors",
            active
              ? "text-foreground"
              : "text-foreground/85 group-hover:text-foreground",
          )}
        >
          {title}
        </div>
        <p className="text-muted-foreground mt-0.5 text-[0.625rem] leading-snug">
          {desc}
        </p>
      </div>
      {active && (
        <span className="bg-primary text-primary-foreground ring-background absolute top-2 right-2 inline-flex size-4 items-center justify-center rounded-full ring-2">
          <Check className="size-2.5" strokeWidth={3} aria-hidden="true" />
        </span>
      )}
    </button>
  );
}
