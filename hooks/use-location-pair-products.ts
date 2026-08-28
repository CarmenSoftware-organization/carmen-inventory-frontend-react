import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/lib/build-query-string";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import type { LocationPairProduct } from "@/types/product";
import type { ParamsDto, PaginatedResponse } from "@/types/params";

/**
 * Hook ดึงรายการสินค้าที่มีอยู่ทั้งใน 2 location พร้อมกัน สำหรับใช้ใน stock transfer
 * ยิงใหม่เมื่อคู่คลังเปลี่ยนเท่านั้น (staleTime Infinity, gcTime 0) default perpage 30
 * จะไม่ fetch จนกว่า buCode, locationId1 และ locationId2 จะพร้อมทั้งหมด
 * @param locationId1 - id ของ location ต้นทาง
 * @param locationId2 - id ของ location ปลายทาง
 * @param params - พารามิเตอร์สำหรับ search/pagination
 * @returns ผลลัพธ์ useQuery แบบ paginate ของ LocationPairProduct
 * @example
 * const { data } = useLocationPairProducts(fromId, toId, { search: query });
 */
export function useLocationPairProducts(
  locationId1: string | undefined,
  locationId2: string | undefined,
  params?: ParamsDto,
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<LocationPairProduct>>({
    queryKey: [
      QUERY_KEYS.LOCATION_PAIR_PRODUCTS,
      buCode,
      locationId1,
      locationId2,
      params,
    ],
    queryFn: async () => {
      const url = buildUrl(
        API_ENDPOINTS.LOCATION_PAIR_PRODUCTS(
          buCode!,
          locationId1!,
          locationId2!,
        ),
        {
          perpage: params?.perpage ?? 30,
          page: params?.page,
          search: params?.search,
        },
      );
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
    enabled: !!buCode && !!locationId1 && !!locationId2,
    // ยิงใหม่เมื่อ "คู่คลังเปลี่ยน" เท่านั้น — คู่คลังอยู่ใน queryKey อยู่แล้ว
    // เปลี่ยนเมื่อไหร่ก็ไม่มีข้อมูลของ key ใหม่ ยิงทันทีเอง
    //
    // staleTime Infinity เพื่อกันการยิงซ้ำจากการ mount observer ตัวใหม่ — ช่อง
    // เลือกสินค้ามีหนึ่งตัวต่อหนึ่งแถว กด "เพิ่มรายการ" ทีก็ mount เพิ่มทีละตัว
    // ถ้าปล่อยให้ข้อมูล stale ทันที ทุกครั้งที่เพิ่มแถวจะยิงซ้ำทั้งที่คู่คลังเดิม
    //
    // gcTime 0 = ออกจากหน้าไปแล้วทิ้งเลย กลับเข้ามาใหม่ได้ของสดเสมอ ไม่ค้างข้าม
    // การเข้าใช้งาน (สินค้าในคลังเปลี่ยนได้ตลอดจากการรับ/จ่ายหน้างาน)
    staleTime: Infinity,
    gcTime: 0,
  });
}
