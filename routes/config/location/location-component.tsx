
import { useTranslations } from "use-intl";
import { ConfigListTemplate } from "@/components/templates/config-list-template";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import type { ActiveFilter } from "@/components/ui/active-filter-bar";
import { useLocation, useDeleteLocation } from "@/hooks/use-location";
import { useURL } from "@/hooks/use-url";
import type { Location } from "@/types/location";
import { useLocationTable } from "./use-location-table";
import LocationCard from "./location-card";

function buildBadges(
  raw: string,
  options: { label: string; value: string }[],
  prefix: string,
  setter: (v: string) => void,
): ActiveFilter[] {
  if (!raw) return [];
  return raw.split(",").flatMap((v) => {
    const match = options.find((o) => o.value === v);
    if (!match) return [];
    return {
      key: `${prefix}-${v}`,
      label: match.label,
      onRemove: () =>
        setter(
          raw
            .split(",")
            .filter((val) => val !== v)
            .join(","),
        ),
    };
  });
}

export default function LocationComponent() {
  const t = useTranslations("config.location");
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  const [locationType, setLocationType] = useURL("location_type");
  const [physicalCount, setPhysicalCount] = useURL("physical_count_type");

  const LOCATION_TYPE_OPTIONS = [
    { label: t("typeInventory"), value: "location_type|string:inventory" },
    { label: t("typeDirect"), value: "location_type|string:direct" },
    {
      label: t("typeConsignment"),
      value: "location_type|string:consignment",
    },
  ];

  const PHYSICAL_COUNT_OPTIONS = [
    { label: t("pcYes"), value: "physical_count_type|string:yes" },
    { label: t("pcNo"), value: "physical_count_type|string:no" },
  ];

  const extraFilter =
    [locationType, physicalCount].filter(Boolean).join(",") || undefined;

  const extraActiveFilters: ActiveFilter[] = [
    ...buildBadges(
      locationType,
      LOCATION_TYPE_OPTIONS,
      "locationType",
      setLocationType,
    ),
    ...buildBadges(
      physicalCount,
      PHYSICAL_COUNT_OPTIONS,
      "physicalCount",
      setPhysicalCount,
    ),
  ];

  return (
    <ConfigListTemplate<Location>
      translationNamespace="config.location"
      entityNameField="name"
      useList={useLocation}
      useDelete={useDeleteLocation}
      useTable={useLocationTable}
      permissionPrefix="configuration.location"
      addPath="/config/location/new"
      getEditPath={(loc) => `/config/location/${loc.id}`}
      exportColumns={[
        { header: tfl("code"), value: (r) => r.code, width: 14 },
        { header: tfl("name"), value: (r) => r.name, width: 28 },
        {
          header: tfl("locationType"),
          value: (r) => r.location_type,
          width: 14,
        },
        {
          header: tfl("physicalCount"),
          value: (r) => r.physical_count_type,
          width: 12,
        },
        {
          header: tfl("deliveryPoint"),
          value: (r) => r.delivery_point_name ?? "",
          width: 22,
        },
        {
          header: tfl("description"),
          value: (r) => r.description ?? "",
          width: 32,
        },
        {
          header: tfl("status"),
          value: (r) => (r.is_active ? ts("active") : ts("inactive")),
          width: 10,
        },
      ]}
      renderCard={({ item, index, onEdit }) => (
        <LocationCard item={item} index={index} onEdit={onEdit} />
      )}
      extraFilter={extraFilter}
      extraActiveFilters={extraActiveFilters}
      onClearExtraFilters={() => {
        setLocationType("");
        setPhysicalCount("");
      }}
      extraToolbar={
        <>
          <MultiSelectFilter
            value={locationType}
            onChange={setLocationType}
            placeholder={tfl("locationType")}
            options={LOCATION_TYPE_OPTIONS}
          />
          <MultiSelectFilter
            value={physicalCount}
            onChange={setPhysicalCount}
            placeholder={tfl("physicalCount")}
            options={PHYSICAL_COUNT_OPTIONS}
          />
        </>
      }
    />
  );
}
