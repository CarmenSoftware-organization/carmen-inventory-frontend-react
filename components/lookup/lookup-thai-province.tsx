
import { useTranslations } from "use-intl";
import { useThaiProvinces, type ThaiProvince } from "@/hooks/use-thai-address";
import { LookupCombobox } from "./lookup-combobox";

interface LookupThaiProvinceProps {
  readonly value: number | "";
  readonly onValueChange: (provinceCode: number) => void;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly onItemChange?: (province: ThaiProvince) => void;
  readonly error?: string;
}

/**
 * Lookup Popover สำหรับเลือกจังหวัดของประเทศไทย
 *
 * ใช้ `useThaiProvinces()` ดึงข้อมูลจังหวัด 77 จังหวัด ค้นหาได้ทั้งภาษาไทย/อังกฤษ/code
 * มี `onItemChange` ส่ง object `ThaiProvince` เต็มสำหรับ reset district/subdistrict
 *
 * @param value - province code ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่ง provinceCode (number)
 * @returns JSX popover element ของ Thai province lookup
 * @example
 * ```tsx
 * <LookupThaiProvince value={provinceCode} onValueChange={setProvinceCode} />
 * ```
 */
export function LookupThaiProvince({
  value,
  onValueChange,
  disabled,
  className,
  onItemChange,
  error,
}: LookupThaiProvinceProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const { data, isLoading } = useThaiProvinces();

  const handleChange = (newValue: string, item?: ThaiProvince) => {
    if (item) {
      onValueChange(item.provinceCode);
      if (onItemChange) {
        onItemChange(item);
      }
    }
  };

  return (
    <LookupCombobox<ThaiProvince>
      value={value.toString()}
      onValueChange={handleChange}
      items={data ?? []}
      getId={(p) => p.provinceCode.toString()}
      getLabel={(p) => p.provinceNameEn}
      getSearchValue={(p) =>
        `${p.provinceNameEn} ${p.provinceNameTh} ${p.provinceCode}`
      }
      disabled={disabled}
      isLoading={isLoading}
      placeholder={tl("select", { entity: tfl("province") })}
      className={className}
      error={error}
    />
  );
}
