import { useTranslations } from "use-intl";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ActiveFilter {
  readonly key: string;
  readonly label: string;
  readonly value?: string;
  readonly onRemove: () => void;
}

interface ActiveFilterBarProps {
  readonly filters: ActiveFilter[];
  readonly onClearAll: () => void;
}

export function ActiveFilterBar({ filters, onClearAll }: ActiveFilterBarProps) {
  const tc = useTranslations("common");

  if (filters.length === 0) return null;

  return (
    <div className="bg-muted/30 flex scrollbar-none flex-nowrap items-center gap-1.5 overflow-x-auto rounded-md px-2 py-1.5 sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
      <span className="text-muted-foreground text-micro-legal sm:text-micro shrink-0">
        {tc("activeFilter")}:
      </span>
      {filters.map((filter) => (
        <Badge
          key={filter.key}
          variant="secondary"
          size="xs"
          className="text-micro-legal sm:text-micro shrink-0 gap-1"
        >
          {filter.value ? (
            <>
              <span className="text-muted-foreground font-normal">
                {filter.label}
              </span>
              {filter.value}
            </>
          ) : (
            filter.label
          )}
          <button
            type="button"
            onClick={filter.onRemove}
            aria-label={`Remove ${filter.label} filter`}
            className="hover:text-foreground -mr-0.5 cursor-pointer rounded-full"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-muted-foreground hover:text-foreground text-micro-legal sm:text-micro shrink-0 cursor-pointer underline"
      >
        {tc("clearAll")}
      </button>
    </div>
  );
}
