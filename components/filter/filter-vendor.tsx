import { useTranslations } from "use-intl";
import { useVendor } from "@/hooks/use-vendor";
import { ACTIVE_ONLY_FILTER } from "@/hooks/use-lookup-pagination";
import type { Vendor } from "@/types/vendor";
import { EntityMultiFilter } from "./entity-multi-filter";

interface FilterVendorProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

/** ตัวกรอง vendor แบบเลือกหลายค่า — clause `vendor_id|string:id1,id2` */
export function FilterVendor({ value, onChange, className }: FilterVendorProps) {
  const tfl = useTranslations("field");
  return (
    <EntityMultiFilter<Vendor>
      value={value}
      onChange={onChange}
      className={className}
      fieldKey="vendor_id"
      label={tfl("vendor")}
      useListHook={useVendor}
      getId={(v) => v.id}
      getLabel={(v) => v.name}
      serverFilter={ACTIVE_ONLY_FILTER}
    />
  );
}
