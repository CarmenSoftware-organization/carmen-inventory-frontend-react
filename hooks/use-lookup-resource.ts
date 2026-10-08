import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/lib/build-query-string";
import { ApiError, ERROR_CODES } from "@/lib/api-error";
import { CACHE_DYNAMIC } from "@/lib/cache-config";
import { MAX_PERPAGE } from "@/lib/fetch-all-pages";
import type { PaginatedResponse } from "@/types/params";
import {
  LOOKUP_EXTRA_FIELDS,
  type LookupItem,
  type LookupResource,
  type LookupScope,
  type LookupServerFilter,
} from "@/types/lookup";

interface UseLookupResourceOptions<T extends LookupItem> {
  /** คำค้น (combobox debounce ให้แล้ว) — เปลี่ยนแล้วเริ่มหน้า 1 ใหม่ */
  search: string;
  /** ไม่ส่ง = `mine` ของ backend · department/location ทั้ง BU ต้องส่ง `"all"` */
  scope?: LookupScope;
  /** id ที่เลือกอยู่ — ดึงตาม id แยกเสมอ ให้ปุ่มแสดงชื่อได้แม้อยู่หลังหน้าแรกหรือถูกปิดใช้งานแล้ว */
  selectedIds?: readonly string[];
  /** false = ไม่ดึงรายการ (lazy คู่กับ `onOpenChange`) — ไม่มีผลกับ `selectedIds` */
  enabled?: boolean;
  /** กรองฝั่ง client หลังโหลด (เช่น excludeIds) — ค่าที่เลือกอยู่ผ่านเสมอ */
  filter?: (item: T) => boolean;
  /** filter ฝั่ง server (ชื่อตาม catalog) — เปลี่ยนแล้วเริ่มหน้า 1 ใหม่ */
  serverFilter?: LookupServerFilter;
  perpage?: number;
}

/** prefix ของทุก query ของ Lookup API — invalidate ตัวนี้ = ล้าง lookup ทุก resource ทุก BU */
export const LOOKUP_QUERY_ROOT = "lookup";

// reference คงที่ — ผู้เรียกเอาไปใส่ deps ได้โดยไม่คำนวณใหม่ทุก render
const EMPTY: never[] = [];

// Number(undefined) เป็น NaN ซึ่ง `??` ไม่จับ — คืน undefined เพื่อให้ตกไป fallback ถัดไป
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** `{ a: ["x","y"], b: "z" }` → `a:x,y;b:z` · ข้ามค่าว่าง · ไม่เหลืออะไรคืน undefined */
export function serializeLookupFilter(
  filter?: LookupServerFilter,
): string | undefined {
  if (!filter) return undefined;
  const parts = Object.entries(filter).flatMap(([key, raw]) => {
    const values = (typeof raw === "string" ? [raw] : (raw ?? [])).filter(
      Boolean,
    );
    return values.length > 0 ? [`${key}:${values.join(",")}`] : [];
  });
  return parts.length > 0 ? parts.join(";") : undefined;
}

// backend เก่ากว่า FE จะไม่มีฟิลด์เพิ่ม — throw ให้ lookup ว่าง (เลือกไม่ได้) ดีกว่าให้ฟอร์ม
// ได้ undefined แล้วคำนวณภาษี/อัตราแลกเปลี่ยนเป็น 0 เงียบ ๆ
function assertExtraFields(
  resource: LookupResource,
  page: PaginatedResponse<LookupItem>,
) {
  const first = page.data?.[0];
  const missing = first
    ? LOOKUP_EXTRA_FIELDS[resource]?.find((field) => !(field in first))
    : undefined;
  if (missing) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_ERROR,
      `Lookup ${resource} is missing ${missing} — backend older than this frontend`,
    );
  }
}

async function fetchLookup<T extends LookupItem>(
  buCode: string,
  resource: LookupResource,
  params: Record<string, string | number | undefined>,
): Promise<PaginatedResponse<T>> {
  const url = buildUrl(`${API_ENDPOINTS.LOOKUP(buCode)}/${resource}`, params);
  const res = await httpClient.get(url);
  if (!res.ok) throw await ApiError.from(res, `Failed to fetch ${resource}`);
  const page = (await res.json()) as PaginatedResponse<T>;
  assertExtraFields(resource, page);
  return page;
}

/**
 * รายการของ lookup แบบแบ่งหน้าจาก `GET /api/:bu_code/lookup/:resource`
 *
 * คืน shape เดียวกับ `useLookupPagination` — component ที่ย้ายมาเปลี่ยนแค่บรรทัดเรียก hook
 * endpoint กรอง active ให้เอง `serverFilter` ใช้กับ filter เพิ่มของ resource (เช่น `location_type`) · ค่าที่เลือกดึงผ่าน `?ids=`
 * ซึ่ง backend ข้ามตัวกรอง active/page ให้
 *
 * @param resource - ชื่อ resource ใน catalog ของ backend
 * @param options - search / scope / selectedIds / enabled / filter / serverFilter / perpage
 * @returns items, selectedItems, สถานะโหลด, loadMore สำหรับเลื่อนแล้วโหลดต่อ
 * @example
 * ```ts
 * const lookup = useLookupResource("unit", {
 *   search, enabled: hasOpened, selectedIds: value ? [value] : [],
 * });
 * ```
 */
export function useLookupResource<T extends LookupItem = LookupItem>(
  resource: LookupResource,
  {
    search,
    scope,
    selectedIds,
    enabled = true,
    filter,
    serverFilter,
    perpage = 30,
  }: UseLookupResourceOptions<T>,
) {
  const buCode = useBuCode();
  const filterParam = serializeLookupFilter(serverFilter);

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
    queryKey: [
      LOOKUP_QUERY_ROOT,
      buCode,
      resource,
      scope,
      filterParam,
      search,
      perpage,
    ],
    queryFn: ({ pageParam }) =>
      fetchLookup<T>(buCode!, resource, {
        page: pageParam,
        perpage,
        search: search || undefined,
        scope,
        filter: filterParam,
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
  const allItems: T[] = [];
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
    queryKey: [
      LOOKUP_QUERY_ROOT,
      buCode,
      resource,
      scope,
      filterParam,
      "ids",
      ids,
    ],
    queryFn: () =>
      fetchLookup<T>(buCode!, resource, {
        ids: ids.join(","),
        perpage: ids.length,
        scope,
        filter: filterParam,
      }),
    ...CACHE_DYNAMIC,
    enabled: ids.length > 0 && !!buCode,
  });

  const known = new Map<string, T>();
  for (const it of allItems) known.set(it.id, it);
  for (const it of selectedData?.data ?? EMPTY) known.set(it.id, it);
  const selectedItems = (selectedIds ?? [])
    .map((id) => known.get(id))
    .filter((it): it is T => it !== undefined);

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
      queryKey: [LOOKUP_QUERY_ROOT, buCode, resource],
    });
  };
}
