import type { PaginatedResponse } from "@/types/params";

export interface LookupListParams {
  search?: string;
  perpage: number;
  page?: number;
  filter?: string;
  sort?: string;
}

export type LookupListHook<T> = (
  params: LookupListParams,
  options?: { enabled?: boolean },
) => {
  data: PaginatedResponse<T> | undefined;
  isLoading: boolean;
  error?: Error | null;
  refetch?: () => unknown;
};

interface UseEntitiesByIdsOptions<T> {
  useListHook: LookupListHook<T>;
  ids: readonly string[];
  /** คอลัมน์ id ฝั่ง backend — ทะเบียนผู้ใช้ไม่มี `id` ต้องใช้ `user_id` */
  idFilterKey?: string;
  enabled?: boolean;
}

// reference คงที่ — ผู้เรียกเอาผลไปใส่ deps ของ useMemo ได้โดยไม่คำนวณใหม่ทุก render
const EMPTY: never[] = [];

/**
 * ดึงเฉพาะแถวที่ id อยู่ใน `ids` ด้วย `filter=<key>|string:a,b` (backend แปลงเป็น IN)
 * แทนการลากทะเบียนทั้งก้อนมาหาชื่อ — เรียง id ก่อนสร้าง filter ให้ query key
 * ตรงกันทุกผู้เรียก (popover กับ chip) react-query จึงยิงครั้งเดียว
 */
export function useEntitiesByIds<T>({
  useListHook,
  ids,
  idFilterKey = "id",
  enabled = true,
}: UseEntitiesByIdsOptions<T>) {
  const sorted = [...new Set(ids.filter(Boolean))].sort();
  const hasIds = sorted.length > 0;

  const { data, isLoading } = useListHook(
    {
      perpage: Math.max(sorted.length, 1),
      filter: hasIds ? `${idFilterKey}|string:${sorted.join(",")}` : undefined,
    },
    { enabled: enabled && hasIds },
  );

  return {
    items: (hasIds ? data?.data : undefined) ?? (EMPTY as T[]),
    isLoading: hasIds && isLoading,
  };
}
