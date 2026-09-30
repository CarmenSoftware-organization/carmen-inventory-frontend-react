import { useEffect } from "react";
import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { profileQueryKey } from "@/hooks/use-profile";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { BU_SWITCH_CHANNEL } from "@/constant/query-keys";
import { ApiError } from "@/lib/api-error";
import { httpClient } from "@/lib/http-client";

export const SWITCH_BU_MUTATION_KEY = ["switch-bu"] as const;

// ใช้ object เดียวทั้งส่งและรับ — BroadcastChannel ไม่ส่งข้อความกลับหา object
// ที่ post เอง แต่ส่งถึง object อื่นใน tab เดียวกันได้ ถ้าแยกกัน tab ที่เป็นคนสลับ
// จะล้าง cache ซ้ำอีกรอบตอนได้ข้อความของตัวเอง
let channel: BroadcastChannel | null | undefined;
function getChannel() {
  if (channel === undefined) {
    try {
      channel = new BroadcastChannel(BU_SWITCH_CHANNEL);
    } catch {
      channel = null; // ไม่รองรับ — ทำงาน tab เดียวก็พอ
    }
  }
  return channel;
}

function removeAllBuData(queryClient: QueryClient) {
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== profileQueryKey[0],
  });
}

/**
 * รับข้อความสลับ BU จาก tab อื่น — mount ครั้งเดียวที่ `routes/root-layout.tsx`
 * (เดิมอยู่ใน `useProfile` ทำให้เปิด channel ใหม่ทุก component ที่เรียกมัน)
 */
export function useBuSwitchSync() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const ch = getChannel();
    if (!ch) return;
    ch.onmessage = () => {
      removeAllBuData(queryClient);
      queryClient.invalidateQueries({ queryKey: profileQueryKey });
    };
    return () => {
      ch.onmessage = null;
    };
  }, [queryClient]);
}

/**
 * Hook สลับ business unit ปัจจุบัน — POST `/api/business-units/default`
 *
 * ไม่ทำ optimistic: ถ้าเปลี่ยน `is_default` ใน cache ก่อน server ตอบ หน้าที่เปิดอยู่
 * จะยิง query ของ BU ใหม่ทันที แล้วโดน `removeAllBuData` ลบทิ้งตอนสำเร็จอยู่ดี
 * เมื่อสำเร็จจะล้าง cache อื่น แล้ว **รอ** profile ใหม่ก่อน `mutateAsync` resolve
 * (หลังบรรทัด await `useProfile().buCode` เป็นของ BU ใหม่แล้ว) และแจ้ง tab อื่น
 */
export function useSwitchBu() {
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiError, string>({
    mutationKey: [...SWITCH_BU_MUTATION_KEY],
    mutationFn: async (buId: string) => {
      const res = await httpClient.post(API_ENDPOINTS.SWITCH_BU, {
        tenant_id: buId,
      });

      if (!res.ok) {
        throw await ApiError.from(res, "Failed to switch business unit");
      }

      return res.json();
    },
    onSuccess: async () => {
      removeAllBuData(queryClient);
      getChannel()?.postMessage("switched");
      await queryClient.refetchQueries({ queryKey: profileQueryKey });
    },
  });
}
