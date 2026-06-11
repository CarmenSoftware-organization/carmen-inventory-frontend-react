
import { Download, Upload } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FilterPill } from "./filter-pill";

export type EntryCountFilter = "all" | "counted" | "uncounted";

interface EntryToolbarProps {
  readonly translationNamespace: string;
  readonly countFilter: EntryCountFilter;
  readonly onFilterChange: (filter: EntryCountFilter) => void;
  readonly totalItems: number;
  readonly countedCount: number;
  readonly uncountedCount: number;
  readonly onImportClick: () => void;
  readonly onExportClick: () => void;
  readonly importDisabled?: boolean;
  readonly exportDisabled?: boolean;
}

export function EntryToolbar({
  translationNamespace,
  countFilter,
  onFilterChange,
  totalItems,
  countedCount,
  uncountedCount,
  onImportClick,
  onExportClick,
  importDisabled = false,
  exportDisabled = false,
}: EntryToolbarProps) {
  const t = useTranslations(translationNamespace);
  const tc = useTranslations("common");

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between">
      <div className="flex flex-wrap items-center gap-1.5">
        <FilterPill
          active={countFilter === "all"}
          onClick={() => onFilterChange("all")}
          label={t("tabAll")}
          count={totalItems}
        />
        <FilterPill
          active={countFilter === "counted"}
          onClick={() => onFilterChange("counted")}
          label={t("counted")}
          count={countedCount}
          tone="success"
        />
        <FilterPill
          active={countFilter === "uncounted"}
          onClick={() => onFilterChange("uncounted")}
          label={t("uncounted")}
          count={uncountedCount}
          tone="warning"
        />
      </div>
      <TooltipProvider delayDuration={100}>
        <div className="flex flex-wrap items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={onImportClick}
                disabled={importDisabled}
              >
                <Upload className="size-3.5" aria-hidden="true" />
                {tc("import")}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{tc("importTooltip")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={onExportClick}
                disabled={exportDisabled}
              >
                <Download className="size-3.5" aria-hidden="true" />
                {tc("export")}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{tc("exportTooltip")}</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
