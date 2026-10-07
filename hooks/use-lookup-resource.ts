import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/lib/build-query-string";
import { ApiError } from "@/lib/api-error";
import { CACHE_DYNAMIC } from "@/lib/cache-config";
import { MAX_PERPAGE } from "@/lib/fetch-all-pages";
import type { PaginatedResponse } from "@/types/params";
import type { LookupItem, LookupResource, LookupScope } from "@/types/lookup";

interface UseLookupResourceOptions {
  /** คำค้น (combobox debounce ให้แล้ว) — เปลี่ยนแล้วเริ่มหน้า 1 ใหม่ */
  search: string;
  /** ไม่ส่ง = `mine` ของ backend · department ต้องส่ง `"all"` */
  scope?: LookupScope;
  /** id ที่เลือกอยู่ — ดึงตาม id แยกเสมอ ให้ปุ่มแสดงชื่อได้แม้อยู่หลังหน้าแรกหรือถูกปิดใช้งานแล้ว */
  selectedIds?: readonly string[];
  /** false = ไม่ดึงรายการ (lazy คู่กับ `onOpenChange`) — ไม่มีผลกับ `selectedIds` */
  enabled?: boolean;
  /** กรองฝั่ง client หลังโหลด (เช่น excludeIds) — ค่าที่เลือกอยู่ผ่านเสมอ */
  filter?: (item: LookupItem) => boolean;
  perpage?: number;
}

// reference คงที่ — ผู้เรียกเอาไปใส่ deps ได้โดยไม่คำนวณใหม่ทุก render
const EMPTY: LookupItem[] = [];

// Number(undefined) เป็น NaN ซึ่ง `??` ไม่จับ — คืน undefined เพื่อให้ตกไป fallback ถัดไป
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

async function fetchLookup(
  buCode: string,
  resource: LookupResource,
  params: Record<string, string | number | undefined>,
): Promise<PaginatedResponse<LookupItem>> {
  const url = buildUrl(`${API_ENDPOINTS.LOOKUP(buCode)}/${resource}`, params);
  const res = await httpClient.get(url);
  if (!res.ok) throw await ApiError.from(res, `Failed to fetch ${resource}`);
  return res.json();
}

/**
 * รายการของ lookup แบบแบ่งหน้าจาก `GET /api/:bu_code/lookup/:resource`
 *
 * คืน shape เดียวกับ `useLookupPagination` — component ที่ย้ายมาเปลี่ยนแค่บรรทัดเรียก hook
 * endpoint กรอง active ให้เอง จึงไม่มี `serverFilter` · ค่าที่เลือกดึงผ่าน `?ids=`
 * ซึ่ง backend ข้ามตัวกรอง active/page ให้
 *
 * @param resource - ชื่อ resource ใน catalog ของ backend
 * @param options - search / scope / selectedIds / enabled / filter / perpage
 * @returns items, selectedItems, สถานะโหลด, loadMore สำหรับเลื่อนแล้วโหลดต่อ
 * @example
 * ```ts
 * const lookup = useLookupResource("unit", {
 *   search, enabled: hasOpened, selectedIds: value ? [value] : [],
 * });
 * ```
 */
export function useLookupResource(
  resource: LookupResource,
  {
    search,
    scope,
    selectedIds,
    enabled = true,
    filter,
    perpage = 30,
  }: UseLookupResourceOptions,
) {
  const buCode = useBuCode();

  // useInfiniteQuery แทน state ของหน้า + effect ต่อท้าย — คำค้น/scope อยู่ใน key
  // จึงเริ่มหน้า 1 ใหม่เอง และ response ของคำค้นเก่าที่ตอบช้าไปลง cache ของ key เก่า
  // ไม่ทับรายการปัจจุบัน
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["lookup", buCode, resource, scope, search, perpage],
    queryFn: ({ pageParam }) =>
      fetchLookup(buCode!, resource, {
        page: pageParam,
        perpage,
        search: search || undefined,
        scope,
      }),
    initialPageParam: 1,
    getNextPageParam: (last, _all, lastPageParam) => {
      const pages = num(last.paginate?.pages) ?? 1;
      return lastPageParam < pages ? lastPageParam + 1 : undefined;
    },
    ...CACHE_DYNAMIC,
    enabled: enabled && !!buCode,
  });

  // ตัดตัวซ้ำด้วย id — offset pagination อาจคืนแถวซ้ำข้ามหน้าเมื่อข้อมูลเปลี่ยนระหว่างเลื่อน
  const allItems: LookupItem[] = [];
  const seen = new Set<string>();
  for (const pg of data?.pages ?? []) {
    for (const it of pg.data ?? EMPTY) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      allItems.push(it);
    }
  }
  // error ต้องหยุดแบ่งหน้า — ไม่งั้น auto-load ของ list จะยิงหน้าที่พังซ้ำไปเรื่อย ๆ
  const hasMore = !!hasNextPage && !error;

  // เรียง id ก่อนสร้าง key ให้ทุกผู้เรียกที่เลือกชุดเดียวกันใช้ cache ร่วมกัน
  const ids = [...new Set((selectedIds ?? []).filter(Boolean))]
    .sort()
    .slice(0, MAX_PERPAGE);
  const { data: selectedData } = useQuery({
    queryKey: ["lookup", buCode, resource, scope, "ids", ids],
    queryFn: () =>
      fetchLookup(buCode!, resource, {
        ids: ids.join(","),
        perpage: ids.length,
        scope,
      }),
    ...CACHE_DYNAMIC,
    enabled: ids.length > 0 && !!buCode,
  });

  const known = new Map<string, LookupItem>();
  for (const it of allItems) known.set(it.id, it);
  for (const it of selectedData?.data ?? EMPTY) known.set(it.id, it);
  const selectedItems = (selectedIds ?? [])
    .map((id) => known.get(id))
    .filter((it): it is LookupItem => it !== undefined);

  const selectedSet = new Set(selectedIds ?? []);
  const items = filter
    ? allItems.filter((it) => selectedSet.has(it.id) || filter(it))
    : allItems;

  // cancelRefetch: false — StrictMode/auto-load เรียกซ้ำระหว่างโหลดอยู่ จะได้ไม่ยกเลิก
  // แล้วยิงหน้าเดิมใหม่ (ไม่ข้ามหน้า เพราะหน้าถัดไปคำนวณจากหน้าสุดท้ายที่ได้มาแล้ว)
  const loadMore = () => {
    if (hasMore && !isFetchingNextPage) {
      void fetchNextPage({ cancelRefetch: false });
    }
  };

  const lastPage = data?.pages[data.pages.length - 1];
  return {
    items,
    selectedItems,
    isLoading,
    isLoadingMore: isFetchingNextPage,
    hasMore,
    loadMore,
    /** จำนวนแถวที่ตรงเงื่อนไขทั้งหมดบน server (ไม่ใช่แค่ที่โหลดมาแล้ว) */
    total: num(lastPage?.paginate?.total) ?? allItems.length,
    error: (error as Error | null) ?? null,
    /** ยิงซ้ำ — ใช้กับปุ่มลองใหม่ของ ErrorState */
    refetch: () => {
      void refetch();
    },
  };
}

/**
 * คืนฟังก์ชันล้าง cache ของ lookup resource หนึ่งใน BU ปัจจุบัน — เรียกหลังสร้าง/แก้แถว
 * ผ่าน dialog ในตัว lookup (mutation ของ config crud invalidate แค่ key ของ list เดิม)
 */
export function useInvalidateLookup(resource: LookupResource) {
  const queryClient = useQueryClient();
  const buCode = useBuCode();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["lookup", buCode, resource],
    });
  };
}
