
import { useTranslations } from "use-intl";
import { useThaiDistricts, type ThaiDistrict } from "@/hooks/use-thai-address";
import { LookupCombobox } from "./lookup-combobox";

interface LookupThaiDistrictProps {
  readonly provinceCode: number | "";
  readonly value: number | "";
  readonly onValueChange: (districtCode: number) => void;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly onItemChange?: (district: ThaiDistrict) => void;
  readonly error?: string;
}

/**
 * Lookup Popover สำหรับเลือกอำเภอ/เขตของประเทศไทย (cascading จาก provinceCode)
 *
 * ใช้ `useThaiDistricts(provinceCode)` ดึงเฉพาะ district ของจังหวัดที่เลือก
 * disabled เมื่อไม่มี `provinceCode` ค้นหาได้ทั้งภาษาไทย/อังกฤษ/code
 * มี `onItemChange` ส่ง object `ThaiDistrict` เต็มสำหรับ reset subdistrict
 *
 * @param value - district code ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่ง districtCode (number)
 * @returns JSX popover element ของ Thai district lookup
 * @example
 * ```tsx
 * <LookupThaiDistrict
 *   provinceCode={provinceCode}
 *   value={districtCode}
 *   onValueChange={setDistrictCode}
 * />
 * ```
 */
export function LookupThaiDistrict({
  provinceCode,
  value,
  onValueChange,
  disabled,
  className,
  onItemChange,
  error,
}: LookupThaiDistrictProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const { data, isLoading } = useThaiDistricts(
    provinceCode === "" ? undefined : provinceCode,
  );

  const handleChange = (newValue: string, item?: ThaiDistrict) => {
    if (item) {
      onValueChange(item.districtCode);
      if (onItemChange) {
        onItemChange(item);
      }
    }
  };

  return (
    <LookupCombobox<ThaiDistrict>
      value={value.toString()}
      onValueChange={handleChange}
      items={data ?? []}
      getId={(d) => d.districtCode.toString()}
      getLabel={(d) => d.districtNameEn}
      getSearchValue={(d) =>
        `${d.districtNameEn} ${d.districtNameTh} ${d.districtCode}`
      }
      disabled={disabled || !provinceCode}
      isLoading={isLoading}
      placeholder={tl("select", { entity: tfl("district") })}
      className={className}
      error={error}
    />
  );
}
