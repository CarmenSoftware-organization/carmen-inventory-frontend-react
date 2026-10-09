import { useEffect, useRef, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import {
  APP_STATUS_RUNNING,
  appStatusStore,
  isAppBlocked,
  parseAppStatus,
  type AppStatusSnapshot,
} from "@/lib/app-status-store";
import { httpClient } from "@/lib/http-client";

// ตรงกับรอบรีเฟรช allowlist ของ gateway (APP_ALLOWLIST_TTL_MS = 60 s) — ถี่กว่านี้ก็ไม่ได้ค่าใหม่กว่า
const POLL_MS = 60_000;

// backend ห่อด้วย `{ data }` เป็นปกติ แต่รับรูปเปล่าด้วยเผื่อ endpoint ตอบตรง
const unwrap = (json: unknown): unknown =>
  typeof json === "object" && json !== null && "data" in json
    ? (json as { data: unknown }).data
    : json;

/**
 * Hook สถานะการให้บริการของแอป — **mount ครั้งเดียวใน root-layout** (เป็นตัว poll ตัวเดียว)
 *
 * ยิง `GET /api/app-status` ตอนเข้าแอป, ทุก 60 วินาที และตอนกลับมาที่แท็บ แล้วเขียนผลลง
 * `appStatusStore` ส่วนค่าที่คืนอ่านจาก store ซึ่ง `http-client` ก็เขียนได้ทันทีที่เจอ 503/403
 * ของสถานะแอประหว่างทาง (probe ที่ออกก่อนรายงานนั้นจะถูกทิ้ง ไม่เขียนทับกลับ)
 *
 * **fail-open**: gateway รุ่นก่อนไม่มี endpoint นี้ (404) = running · 401 (app id ไม่รู้จัก)
 * = running และไม่เตะ session · error อื่นไม่แตะ store (คงค่าเดิมไว้) — เหมือน `useBackendVersion`
 *
 * เมื่อหลุดจากสถานะที่บล็อก (หน้าเต็มจอ) กลับมาใช้งานได้ จะ invalidate query ทั้งหมด
 * ให้หน้าที่ล้มไประหว่างปิดปรับปรุงโหลดใหม่เองโดยไม่ต้อง reload
 *
 * @returns snapshot ปัจจุบัน, `recheck` สำหรับปุ่ม "ตรวจสอบอีกครั้ง", `isChecking`
 */
export function useAppStatus(): {
  snapshot: AppStatusSnapshot;
  recheck: () => void;
  isChecking: boolean;
} {
  const queryClient = useQueryClient();

  const query = useQuery<AppStatusSnapshot>({
    queryKey: [QUERY_KEYS.APP_STATUS],
    queryFn: async () => {
      const token = appStatusStore.probeToken();
      const res = await httpClient.get(API_ENDPOINTS.APP_STATUS, {
        rawUnauthorized: true,
      });
      let snapshot: AppStatusSnapshot;
      if (res.status === 404 || res.status === 401) {
        snapshot = APP_STATUS_RUNNING;
      } else if (res.ok) {
        snapshot = parseAppStatus(unwrap(await res.json().catch(() => null)));
      } else {
        throw new Error(`Failed to fetch app status (${res.status})`);
      }
      appStatusStore.setFromProbe(snapshot, token);
      return snapshot;
    },
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: false,
  });

  const snapshot = useSyncExternalStore(
    appStatusStore.subscribe,
    appStatusStore.get,
    appStatusStore.get,
  );

  const blocked = isAppBlocked(snapshot);
  const wasBlocked = useRef(blocked);
  useEffect(() => {
    if (wasBlocked.current && !blocked) {
      void queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] !== QUERY_KEYS.APP_STATUS,
      });
    }
    wasBlocked.current = blocked;
  }, [blocked, queryClient]);

  return {
    snapshot,
    recheck: () => void query.refetch(),
    isChecking: query.isFetching,
  };
}
