import { useQuery } from "@tanstack/react-query";
import { CACHE_STATIC } from "@/lib/cache-config";

export interface ThaiProvince {
  id: number;
  provinceCode: number;
  provinceNameEn: string;
  provinceNameTh: string;
}

export interface ThaiDistrict {
  id: number;
  provinceCode: number;
  districtCode: number;
  districtNameEn: string;
  districtNameTh: string;
  postalCode: number;
}

/**
 * Hook ดึงรายชื่อจังหวัดของประเทศไทยจากไฟล์ static JSON ใน public
 * ใช้ CACHE_STATIC (staleTime 30 นาที) เพราะเป็น master data ถาวร
 * @returns ผลลัพธ์ useQuery ของ ThaiProvince[]
 * @example
 * const { data: provinces = [] } = useThaiProvinces();
 */
export function useThaiProvinces() {
  return useQuery<ThaiProvince[]>({
    queryKey: ["thai-provinces"],
    queryFn: async () => {
      const res = await fetch("/data/thai-provinces.json");
      if (!res.ok) throw new Error("Failed to load provinces");
      return res.json();
    },
    ...CACHE_STATIC,
  });
}

export interface ThaiSubDistrict {
  id: number;
  provinceCode: number;
  districtCode: number;
  subdistrictCode: number;
  subdistrictNameEn: string;
  subdistrictNameTh: string;
  postalCode: number;
}

/**
 * Hook ดึงรายชื่ออำเภอตามรหัสจังหวัดจากไฟล์ static
 * Filter ฝั่ง client หลังโหลด JSON ไม่ fetch จนกว่าจะมี provinceCode
 * @param provinceCode - รหัสจังหวัด
 * @returns ผลลัพธ์ useQuery ของ ThaiDistrict[]
 * @example
 * const { data: districts } = useThaiDistricts(provinceCode);
 */
export function useThaiDistricts(provinceCode?: number) {
  return useQuery<ThaiDistrict[]>({
    queryKey: ["thai-districts", provinceCode],
    queryFn: async () => {
      const res = await fetch("/data/thai-districts.json");
      if (!res.ok) throw new Error("Failed to load districts");
      const all: ThaiDistrict[] = await res.json();
      return provinceCode ? all.filter((d) => d.provinceCode === provinceCode) : all;
    },
    enabled: !!provinceCode,
    ...CACHE_STATIC,
  });
}

/**
 * Hook ดึงรายชื่อตำบลตามรหัสอำเภอจากไฟล์ static
 * Filter ฝั่ง client หลังโหลด JSON ไม่ fetch จนกว่าจะมี districtCode
 * @param districtCode - รหัสอำเภอ
 * @returns ผลลัพธ์ useQuery ของ ThaiSubDistrict[]
 * @example
 * const { data: sub } = useThaiSubDistricts(districtCode);
 */
export function useThaiSubDistricts(districtCode?: number) {
  return useQuery<ThaiSubDistrict[]>({
    queryKey: ["thai-subdistricts", districtCode],
    queryFn: async () => {
      const res = await fetch("/data/thai-subdistricts.json");
      if (!res.ok) throw new Error("Failed to load sub-districts");
      const all: ThaiSubDistrict[] = await res.json();
      return districtCode ? all.filter((d) => d.districtCode === districtCode) : all;
    },
    enabled: !!districtCode,
    ...CACHE_STATIC,
  });
}

export interface ThaiReverseLookupResult {
  provinceCode: number;
  provinceName: string;
  districtCode: number;
  districtName: string;
  subdistricts: ThaiSubDistrict[];
}

/**
 * Hook ค้นหาที่อยู่ (จังหวัด/อำเภอ/ตำบล) จากรหัสไปรษณีย์
 * โหลด static JSON ทั้ง 3 ไฟล์ parallel แล้ว lookup จาก postal code
 * จะ fetch เฉพาะเมื่อ postalCode ยาว 5 หลัก
 * @param postalCode - รหัสไปรษณีย์ 5 หลัก
 * @returns ผลลัพธ์ useQuery ของ ThaiReverseLookupResult | null
 * @example
 * const { data } = useThaiReverseLookup(form.watch("postal_code"));
 */
export function useThaiReverseLookup(postalCode?: string) {
  return useQuery<ThaiReverseLookupResult | null>({
    queryKey: ["thai-reverse-lookup", postalCode],
    queryFn: async () => {
      const [subRes, distRes, provRes] = await Promise.all([
        fetch("/data/thai-subdistricts.json"),
        fetch("/data/thai-districts.json"),
        fetch("/data/thai-provinces.json"),
      ]);
      if (!subRes.ok || !distRes.ok || !provRes.ok) return null;

      const code = Number(postalCode);
      const allSub: ThaiSubDistrict[] = await subRes.json();
      const matches = allSub.filter((d) => d.postalCode === code);
      if (matches.length === 0) return null;

      const firstMatch = matches[0];
      const allDist: ThaiDistrict[] = await distRes.json();
      const district = allDist.find(
        (d) => d.districtCode === firstMatch.districtCode,
      );

      const allProv: ThaiProvince[] = await provRes.json();
      const province = allProv.find(
        (p) => p.provinceCode === firstMatch.provinceCode,
      );

      return {
        provinceCode: firstMatch.provinceCode,
        provinceName: province?.provinceNameEn ?? "",
        districtCode: firstMatch.districtCode,
        districtName: district?.districtNameEn ?? "",
        subdistricts: matches,
      };
    },
    enabled: !!postalCode && postalCode.length === 5,
    ...CACHE_STATIC,
  });
}
