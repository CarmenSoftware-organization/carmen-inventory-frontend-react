import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { httpClient } from "@/lib/http-client";
import type { UserLicenseResponse } from "@/types/license";

export const licenseQueryKey = [QUERY_KEYS.LICENSE] as const;

/**
 * ดึง license ของผู้ใช้จาก `GET /api/license`
 *
 * ก้อนนี้เคยฝังอยู่ใน `GET /api/user/profile` — backend ถอดออกเมื่อ 2026-09-09
 * และเป็น breaking change ที่ต้อง deploy คู่กัน · response ครอบ **ทุก BU** ของผู้ใช้
 * ในคำขอเดียว (`business_unit` คีย์ด้วย `business_unit_id`) จึงไม่ต้องยิงใหม่ตอนสลับ BU
 * และไม่ต้องรอ `buCode` — ยิงคู่ขนานกับ profile ได้เลยไม่ต่อคิว
 *
 * **ห้ามให้ error ก้อนนี้บล็อกทั้งแอป** — ผู้เรียก (`useLicense`) fail-open เมื่อไม่มีข้อมูล
 * เหมือนกรณี gateway รุ่นเก่าที่ยังไม่มี endpoint นี้ทุกประการ (404 ก็เดินทางเดียวกัน)
 *
 * ⚠️ `httpClient` เคลียร์ session ให้ทุก 401 ที่ refresh แล้วยังไม่ผ่าน — ถ้า app-id ของ
 * แอปนี้ยังไม่ถูกผูกกับ api_name `license.getForUser` ใน allowlist ของ platform DB
 * `AppIdGuard` จะตอบ 401 แล้ว**เตะผู้ใช้ออกทั้งแอป** ไม่ใช่แค่ license ไม่มา
 * ต้องเติม allowlist ให้ครบทุก environment ก่อน deploy เสมอ
 */
export function useLicenseQuery() {
  return useQuery<UserLicenseResponse>({
    queryKey: licenseQueryKey,
    queryFn: async () => {
      const res = await httpClient.get(API_ENDPOINTS.LICENSE);

      if (!res.ok) throw new Error("Failed to fetch license");

      const json = await res.json();
      return json.data;
    },
    staleTime: Infinity,
    retry: 1,
  });
}
