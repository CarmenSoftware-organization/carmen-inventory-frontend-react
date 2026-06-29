
import { useTranslations } from "use-intl";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface StatusSwitchProps {
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
  readonly disabled?: boolean;
  readonly label?: string;
  readonly description?: string;
  readonly activeText?: string;
  readonly inactiveText?: string;
  readonly id?: string;
  /** ซ่อน status badge ด้านล่าง (เลี่ยง redundant กับ Switch toggle) */
  readonly hideBadge?: boolean;
}

function StatusSwitch({
  checked,
  onCheckedChange,
  disabled,
  label,
  description,
  activeText,
  inactiveText,
  id,
  hideBadge = false,
}: StatusSwitchProps) {
  const tfl = useTranslations("field");

  const resolvedLabel = label ?? tfl("active");
  const resolvedActiveText = activeText ?? tfl("active");
  const resolvedInactiveText = inactiveText ?? tfl("inactive");
  const resolvedDescription = description ?? tfl("activeDescription");

  return (
    <div className="space-y-0.5 rounded-md border p-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold">{resolvedLabel}</p>
          {resolvedDescription && (
            <p className="text-muted-foreground text-[0.6875rem]">
              {resolvedDescription}
            </p>
          )}
        </div>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-label={resolvedLabel}
        />
      </div>
      {!hideBadge && (
        <Badge
          variant={checked ? "success" : "destructive"}
          className="px-2 py-0 text-[10px]"
        >
          {checked ? resolvedActiveText : resolvedInactiveText}
        </Badge>
      )}
    </div>
  );
}

export { StatusSwitch, type StatusSwitchProps };
