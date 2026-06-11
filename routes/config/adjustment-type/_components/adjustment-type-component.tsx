
import { useTranslations } from "use-intl";
import { ConfigListTemplate } from "@/components/templates/config-list-template";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import type { ActiveFilter } from "@/components/ui/active-filter-bar";
import {
  useAdjustmentType,
  useDeleteAdjustmentType,
} from "@/hooks/use-adjustment-type";
import { useURL } from "@/hooks/use-url";
import type { AdjustmentType } from "@/types/adjustment-type";
import { useAdjustmentTypeTable } from "./use-adjustment-type-table";
import { AdjustmentTypeDialog } from "./adjustment-type-dialog";
import AdjustmentTypeCard from "./adjustment-type-card";

export default function AdjustmentTypeComponent() {
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  const [adjType, setAdjType] = useURL("adj_type");

  const TYPE_OPTIONS = [
    { label: tfl("stockIn"), value: "type|string:STOCK_IN" },
    { label: tfl("stockOut"), value: "type|string:STOCK_OUT" },
  ];

  const extraActiveFilters: ActiveFilter[] = !adjType
    ? []
    : adjType
        .split(",")
        .map((v) => {
          const match = TYPE_OPTIONS.find((o) => o.value === v);
          if (!match) return null;
          return {
            key: `adjType-${v}`,
            label: match.label,
            onRemove: () =>
              setAdjType(
                adjType
                  .split(",")
                  .filter((val) => val !== v)
                  .join(","),
              ),
          } satisfies ActiveFilter;
        })
        .filter((f): f is ActiveFilter => f !== null);

  return (
    <ConfigListTemplate<AdjustmentType>
      translationNamespace="config.adjustmentType"
      entityNameField="name"
      useList={useAdjustmentType}
      useDelete={useDeleteAdjustmentType}
      useTable={useAdjustmentTypeTable}
      permissionPrefix="configuration.adjustment_type"
      defaultSort="code:asc,name:asc"
      exportColumns={[
        { header: tfl("code"), value: (r) => r.code, width: 14 },
        { header: tfl("name"), value: (r) => r.name, width: 28 },
        { header: tfl("type"), value: (r) => r.type, width: 14 },
        {
          header: tfl("description"),
          value: (r) => r.description ?? "",
          width: 32,
        },
        {
          header: tfl("note"),
          value: (r) => r.note ?? "",
          width: 32,
        },
        {
          header: tfl("status"),
          value: (r) => (r.is_active ? ts("active") : ts("inactive")),
          width: 10,
        },
      ]}
      renderDialog={({ open, onOpenChange, entity, readOnly }) => (
        <AdjustmentTypeDialog
          open={open}
          onOpenChange={onOpenChange}
          adjustmentType={entity}
          readOnly={readOnly}
        />
      )}
      renderCard={({ item, index, onEdit }) => (
        <AdjustmentTypeCard item={item} index={index} onEdit={onEdit} />
      )}
      extraFilter={adjType || undefined}
      extraActiveFilters={extraActiveFilters}
      onClearExtraFilters={() => setAdjType("")}
      extraToolbar={
        <MultiSelectFilter
          value={adjType}
          onChange={setAdjType}
          placeholder={tfl("type")}
          options={TYPE_OPTIONS}
        />
      }
    />
  );
}
