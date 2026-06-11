
import { useTranslations } from "use-intl";
import {
  useThaiSubDistricts,
  type ThaiSubDistrict,
} from "@/hooks/use-thai-address";
import { LookupCombobox } from "./lookup-combobox";

interface LookupThaiSubDistrictProps {
  readonly districtCode: number | "";
  readonly value: number | "";
  readonly onValueChange: (subdistrictCode: number) => void;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly onItemChange?: (subdistrict: ThaiSubDistrict) => void;
  readonly error?: string;
}

/**
 * Lookup Popover สำหรับเลือกตำบล/แขวงของประเทศไทย (cascading จาก districtCode)
 *
 * ใช้ `useThaiSubDistricts(districtCode)` ดึงเฉพาะตำบลของอำเภอที่เลือก
 * disabled เมื่อไม่มี `districtCode` ค้นหาได้ทั้งภาษาไทย/อังกฤษ/code
 * มี `onItemChange` ส่ง object `ThaiSubDistrict` เต็มสำหรับ set postal code
 *
 * @param value - subdistrict code ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่ง subdistrictCode (number)
 * @returns JSX popover element ของ Thai subdistrict lookup
 * @example
 * ```tsx
 * <LookupThaiSubDistrict
 *   districtCode={districtCode}
 *   value={subdistrictCode}
 *   onValueChange={setSubdistrictCode}
 *   onItemChange={(s) => setPostalCode(s.postalCode)}
 * />
 * ```
 */
export function LookupThaiSubDistrict({
  districtCode,
  value,
  onValueChange,
  disabled,
  className,
  onItemChange,
  error,
}: LookupThaiSubDistrictProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const { data, isLoading } = useThaiSubDistricts(
    districtCode === "" ? undefined : districtCode,
  );

  const handleChange = (newValue: string, item?: ThaiSubDistrict) => {
    if (item) {
      onValueChange(item.subdistrictCode);
      if (onItemChange) {
        onItemChange(item);
      }
    }
  };

  return (
    <LookupCombobox<ThaiSubDistrict>
      value={value.toString()}
      onValueChange={handleChange}
      items={data ?? []}
      getId={(d) => d.subdistrictCode.toString()}
      getLabel={(d) => d.subdistrictNameEn}
      getSearchValue={(d) =>
        `${d.subdistrictNameEn} ${d.subdistrictNameTh} ${d.subdistrictCode}`
      }
      disabled={disabled || !districtCode}
      isLoading={isLoading}
      placeholder={tl("select", { entity: tfl("subDistrict") })}
      className={className}
      error={error}
    />
  );
}
