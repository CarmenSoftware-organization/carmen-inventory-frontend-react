import { useMutation, useQueryClient } from "@tanstack/react-query";
import { profileQueryKey } from "@/hooks/use-profile";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { BU_SWITCH_CHANNEL } from "@/constant/query-keys";
import { ApiError } from "@/lib/api-error";
import { httpClient } from "@/lib/http-client";
import type { UserProfile } from "@/types/profile";

export const SWITCH_BU_MUTATION_KEY = ["switch-bu"] as const;

interface SwitchBuContext {
  previousProfile: UserProfile | undefined;
}

/**
 * ลบ cache ทั้งหมดที่ผูกกับ BU ปัจจุบัน ยกเว้น profile
 *
 * @param queryClient - instance ของ react-query client
 */
function removeAllBuData(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== profileQueryKey[0],
  });
}

/**
 * Hook สลับ business unit ปัจจุบัน
 *
 * ทำ optimistic update บน profile cache ทันที (เปลี่ยน `is_default` ของ BU ที่เลือก)
 * เพื่อให้ทุก hook ที่อ่าน `buCode` จาก `useProfile` เห็นค่าใหม่ทันที
 * โดยไม่ต้องรอ network roundtrip จากนั้นยิง POST `/api/business-unit/default`
 * เมื่อสำเร็จจะลบ cache อื่น + invalidate profile เพื่อยืนยันข้อมูลจาก backend
 * ส่ง message ผ่าน `BroadcastChannel` เพื่อให้ tab อื่นรู้ตัว
 * เมื่อ error จะ rollback กลับไปใช้ profile เดิม
 *
 * @returns mutation สำหรับ switch BU (รับ buId เป็น variable)
 * @example
 * ```ts
 * const switchBu = useSwitchBu();
 * await switchBu.mutateAsync("bu-uuid-123");
 * // หลังบรรทัดนี้ useProfile().buCode จะเป็นของ BU ใหม่แล้ว
 * ```
 */
export function useSwitchBu() {
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiError, string, SwitchBuContext>({
    mutationKey: [...SWITCH_BU_MUTATION_KEY],
    mutationFn: async (buId: string) => {
      const res = await httpClient.post(API_ENDPOINTS.SWITCH_BU, {
        tenant_id: buId,
      });

      if (!res.ok) {
        throw ApiError.fromResponse(res, "Failed to switch business unit");
      }

      return res.json();
    },
    onMutate: async (buId) => {
      await queryClient.cancelQueries({ queryKey: profileQueryKey });

      const previousProfile =
        queryClient.getQueryData<UserProfile>(profileQueryKey);

      if (previousProfile) {
        queryClient.setQueryData<UserProfile>(profileQueryKey, {
          ...previousProfile,
          business_unit: previousProfile.business_unit.map((bu) => ({
            ...bu,
            is_default: bu.id === buId,
          })),
        });
      }

      return { previousProfile };
    },
    onError: (_err, _buId, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(profileQueryKey, context.previousProfile);
      }
    },
    onSuccess: () => {
      removeAllBuData(queryClient);
      queryClient.invalidateQueries({ queryKey: profileQueryKey });

      try {
        const channel = new BroadcastChannel(BU_SWITCH_CHANNEL);
        channel.postMessage("switched");
        channel.close();
      } catch {
        // BroadcastChannel not supported — single-tab fallback is fine
      }
    },
  });
}
