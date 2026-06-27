import type { ActiveFilter } from "@/components/ui/active-filter-bar";

export interface FilterOption {
  readonly label: string;
  readonly value: string;
}

export const STATUS_OPTIONS: FilterOption[] = [
  { label: "Active", value: "is_active|bool:true" },
  { label: "Inactive", value: "is_active|bool:false" },
];

export const WF_TYPE_OPTIONS: FilterOption[] = [
  {
    label: "Purchase Request",
    value: "workflow_type|string:purchase_request_workflow",
  },
  {
    label: "Purchase Order",
    value: "workflow_type|string:purchase_order_workflow",
  },
  {
    label: "Store Requisition",
    value: "workflow_type|string:store_requisition_workflow",
  },
];

interface BuildFiltersInput {
  readonly filter: string;
  readonly wfType: string;
  readonly setFilter: (value: string) => void;
  readonly setWfType: (value: string) => void;
}

const removeFromCsv = (csv: string, value: string): string =>
  csv
    .split(",")
    .filter((v) => v !== value)
    .join(",");

const findStatusFilter = (
  filter: string,
  setFilter: (value: string) => void,
): ActiveFilter | null => {
  if (!filter) return null;
  const match = STATUS_OPTIONS.find((o) => o.value === filter);
  if (!match) return null;
  return {
    key: `status-${filter}`,
    label: match.label,
    onRemove: () => setFilter(""),
  };
};

const findTypeFilters = (
  wfType: string,
  setWfType: (value: string) => void,
): ActiveFilter[] => {
  if (!wfType) return [];
  return wfType
    .split(",")
    .map((v) => {
      const match = WF_TYPE_OPTIONS.find((o) => o.value === v);
      if (!match) return null;
      return {
        key: `wfType-${v}`,
        label: match.label,
        onRemove: () => setWfType(removeFromCsv(wfType, v)),
      } satisfies ActiveFilter;
    })
    .filter((f): f is ActiveFilter => f !== null);
};

export function buildActiveFilters(input: BuildFiltersInput): ActiveFilter[] {
  const status = findStatusFilter(input.filter, input.setFilter);
  const types = findTypeFilters(input.wfType, input.setWfType);
  return status ? [status, ...types] : types;
}
