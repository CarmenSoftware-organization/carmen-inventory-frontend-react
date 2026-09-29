import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/lib/build-query-string";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import type { User } from "@/types/workflows";
import { fetchAllPages } from "@/lib/fetch-all-pages";
import { CACHE_NORMAL } from "@/lib/cache-config";

/**
 * Hook ดึงผู้ใช้ทั้งหมด (วนหน้าละ 100 ผ่าน fetchAllPages) — ชั่วคราวจนช่วง 4b เปลี่ยน Transfer ของ location/department form
 * ใช้ CACHE_NORMAL (staleTime 5 นาที) เพราะรายชื่อผู้ใช้เปลี่ยนไม่บ่อย
 * คืนค่าเฉพาะ array ของ User (unwrap จาก PaginatedResponse)
 * @param enabled - ส่ง false เพื่อเลื่อนการ fetch (lazy) จนกว่า caller จะพร้อม
 *   เช่น lookup ที่จะโหลดต่อเมื่อผู้ใช้เปิด popover เท่านั้น
 * @returns UseQueryResult ของ User[]
 * @example
 * const { data: users = [] } = useAllUsers();
 * <LookupUser options={users} value={userId} onValueChange={setUserId} />
 */
export function useAllUsers(enabled = true) {
  const buCode = useBuCode();

  return useQuery<User[]>({
    queryKey: [QUERY_KEYS.USERS, buCode, "all"],
    queryFn: () =>
      fetchAllPages<User>(async (page, perpage) => {
        const url = buildUrl(API_ENDPOINTS.USERS(buCode!), {
          page,
          perpage,
        });
        const res = await httpClient.get(url);
        if (!res.ok) throw new Error("Failed to fetch users");
        return res.json();
      }),
    enabled: enabled && !!buCode,
    ...CACHE_NORMAL,
  });
}
