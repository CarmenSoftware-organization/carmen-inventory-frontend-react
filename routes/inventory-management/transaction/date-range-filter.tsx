
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DATE_RANGE_VALUES = ["today", "7d", "30d", "this_month"] as const;

export type DateRangeValue = (typeof DATE_RANGE_VALUES)[number];

const LABEL_KEYS: Record<DateRangeValue, string> = {
  today: "today",
  "7d": "sevenDays",
  "30d": "thirtyDays",
  this_month: "thisMonth",
};

interface DateRangeFilterProps {
  readonly value: DateRangeValue | "";
  readonly onChange: (value: DateRangeValue | "") => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const t = useTranslations("inventoryManagement.transaction");

  return (
    <div className="flex items-center rounded-md border">
      {DATE_RANGE_VALUES.map((val) => (
        <Button
          key={val}
          type="button"
          size="sm"
          variant="ghost"
          className={cn(
            "h-7 rounded-none border-r px-2 text-xs last:border-r-0",
            value === val &&
              "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
          )}
          onClick={() => onChange(value === val ? "" : val)}
        >
          {t(LABEL_KEYS[val])}
        </Button>
      ))}
    </div>
  );
}
