import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

const TIME_QUERY_KEY = ["server-time"] as const;

/**
 * Phase 0 stub: ไม่มี /api/time server route แล้ว — ใช้เวลาเครื่อง client ไปก่อน
 * Open item (spec §6): ย้ายไป backend time endpoint เมื่อโมดูลที่ใช้ sync เวลาถูก migrate
 *
 * @returns object ที่มี now (ISO string) และ offset (ms) — offset = 0 เพราะใช้เวลาเครื่อง
 * @example
 * ```ts
 * const { now, offset } = await fetchServerTime();
 * ```
 */
async function fetchServerTime(): Promise<{ now: string; offset: number }> {
  return { now: new Date().toISOString(), offset: 0 };
}

/**
 * Hook คืนค่า Date ที่อัพเดตทุกวินาที โดย sync กับเวลา server
 *
 * ใช้ react-query cache เวลา server เพื่อ share ระหว่าง component
 * re-sync ทุก 5 นาทีเพื่อป้องกัน drift จาก client clock
 * ใช้สำหรับแสดงเวลาบน dashboard/header ที่ต้องถูกต้องตรงกันทุก client
 *
 * @returns Date ปัจจุบันตามเวลา server หรือ null ระหว่างโหลด
 * @example
 * ```ts
 * const now = useServerTime();
 * <span>{now?.toLocaleTimeString()}</span>
 * ```
 */
export function useServerTime(): Date | null {
  const { data } = useQuery({
    queryKey: TIME_QUERY_KEY,
    queryFn: fetchServerTime,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const offset = data?.offset ?? 0;
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date(Date.now() + offset));
    queueMicrotask(update);
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [offset]);

  return now;
}
