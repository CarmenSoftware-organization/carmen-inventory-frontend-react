import { useState } from "react";
import { useTranslations } from "use-intl";
import { usePhysicalCountPeriod } from "@/hooks/use-physical-count-period";
import { formatDate } from "@/lib/date-utils";
import type { PhysicalCountPeriod } from "@/types/physical-count-period";
import { LookupCombobox } from "./lookup-combobox";

interface LookupPhysicalCountPeriodProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onItemChange?: (item: PhysicalCountPeriod) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm" | "default";
  readonly error?: string;
}

function formatPeriodLabel(period: PhysicalCountPeriod): string {
  const from = formatDate(period.counting_period_from_date, "DD MMM YYYY");
  const to = formatDate(period.counting_period_to_date, "DD MMM YYYY");
  return `${from} — ${to}`;
}

export function LookupPhysicalCountPeriod({
  value,
  onValueChange,
  onItemChange,
  disabled,
  placeholder,
  className,
  size,
  error,
}: LookupPhysicalCountPeriodProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  // Lazy: ยิง API ตอนเปิด popover ครั้งแรก หรือเมื่อมีค่าเลือกไว้แล้ว (resolve label)
  const [hasOpened, setHasOpened] = useState(false);
  const { data, isLoading } = usePhysicalCountPeriod(
    { perpage: -1 },
    { enabled: hasOpened || !!value },
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const periods = (data?.data ?? [])
    .filter((p) => new Date(p.counting_period_from_date) <= today)
    .sort(
      (a, b) =>
        new Date(b.counting_period_from_date).getTime() -
        new Date(a.counting_period_from_date).getTime(),
    );

  return (
    <LookupCombobox
      size={size}
      value={value}
      onValueChange={(id, item) => {
        onValueChange(id);
        if (item) onItemChange?.(item);
      }}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={periods}
      getId={(p) => p.id}
      getLabel={formatPeriodLabel}
      getSearchValue={(p) => formatPeriodLabel(p)}
      placeholder={
        placeholder ?? tl("select", { entity: tfl("physicalCountPeriod") })
      }
      searchPlaceholder={tl("search", { entity: tfl("physicalCountPeriod") })}
      disabled={disabled}
      className={className}
      isLoading={isLoading}
      error={error}
    />
  );
}
