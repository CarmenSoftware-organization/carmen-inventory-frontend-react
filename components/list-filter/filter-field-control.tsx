import { useTranslations } from "use-intl";
import { StatusFilter } from "@/components/ui/status-filter";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { FilterAmountRange } from "@/components/filter/filter-amount-range";
import { FilterDate } from "@/components/filter/filter-date";
import { EntityMultiFilter } from "@/components/filter/entity-multi-filter";
import {
  entityGetId,
  entityServerFilter,
} from "@/components/filter/entity-filter-source";
import { FilterStage } from "@/components/filter/filter-stage";
import { FilterWorkflow } from "@/components/filter/filter-workflow";
import type { FilterFieldDef, FilterPeerAccess } from "@/types/list-filter";

interface Props {
  readonly field: FilterFieldDef;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly peer?: FilterPeerAccess;
}

export function FilterFieldControl({ field, value, onChange, peer }: Props) {
  const t = useTranslations();

  switch (field.control) {
    case "status":
      return (
        <StatusFilter
          value={value}
          onChange={onChange}
          options={field.options?.map((o) => ({
            label: t(o.labelKey),
            value: o.value,
          }))}
          className="w-full"
        />
      );
    case "multi-select":
      return (
        <MultiSelectFilter
          value={value}
          onChange={onChange}
          options={field.options.map((o) => ({
            label: t(o.labelKey),
            value: o.value,
          }))}
          searchable={field.searchable}
          className="w-full"
        />
      );
    case "date-range":
      return (
        <FilterDate
          value={value}
          onChange={onChange}
          fieldKey={field.fieldKey}
        />
      );
    case "amount-range":
      return (
        <FilterAmountRange
          value={value}
          onChange={onChange}
          fieldKey={field.fieldKey}
          className="w-full"
        />
      );
    case "entity": {
      const source = field.entity;
      return (
        <EntityMultiFilter
          value={value}
          onChange={onChange}
          className="w-full"
          fieldKey={source.fieldKey}
          label={t(field.labelKey)}
          useListHook={source.useListHook}
          getId={entityGetId(source)}
          getLabel={source.getLabel}
          serverFilter={entityServerFilter(source)}
          idFilterKey={source.idFilterKey}
          bareIds={source.bareIds}
        />
      );
    }
    case "stage":
      return (
        <FilterStage
          value={value}
          onChange={onChange}
          stages={field.stages}
          className="w-full"
        />
      );
    case "workflow":
      return (
        <FilterWorkflow
          value={value}
          onChange={onChange}
          workflowType={field.workflowType}
          className="w-full"
        />
      );
    case "custom":
      return <>{field.render(value, onChange, peer)}</>;
  }
}
