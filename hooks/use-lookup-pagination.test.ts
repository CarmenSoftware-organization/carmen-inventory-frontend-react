import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type {
  LookupListHook,
  LookupListParams,
} from "@/hooks/use-entities-by-ids";
import { useLookupPagination } from "./use-lookup-pagination";

interface Row {
  id: string;
}

const PERPAGE = 2;

type ListResult = ReturnType<LookupListHook<Row>>;

/**
 * list hook ปลอมที่ตอบทันทีตามหน้าที่ขอ — จดเลขหน้าที่ถูกขอไว้ใน `pages`
 * (ไม่นับการเรียกจาก useEntitiesByIds ซึ่งไม่ส่ง `page`)
 *
 * response ของแต่ละหน้าต้องเป็น reference เดิมทุก render เหมือน react-query
 * — ไม่งั้น effect ต่อหน้าของ hook (deps `[data, page]`) จะวนไม่จบ
 */
function fakeListHook(totalPages: number) {
  const pages: number[] = [];
  const cache = new Map<number, ListResult>();
  const hook: LookupListHook<Row> = (params: LookupListParams) => {
    const page = params.page;
    if (page == null) return { data: undefined, isLoading: false };
    if (pages.at(-1) !== page) pages.push(page);
    const hit = cache.get(page);
    if (hit) return hit;
    const res = {
      data: {
        data: Array.from({ length: PERPAGE }, (_, i) => ({
          id: `p${page}-${i}`,
        })),
        paginate: {
          page,
          perpage: PERPAGE,
          pages: totalPages,
          total: totalPages * PERPAGE,
        },
      },
      isLoading: false,
    } as ListResult;
    cache.set(page, res);
    return res;
  };
  return { hook, pages };
}

describe("useLookupPagination — loadMore", () => {
  // StrictMode รัน effect auto-load ของ VirtualCommandList สองรอบด้วย closure เดิม
  // ถ้า loadMore เป็น `p + 1` เฉย ๆ จะกระโดดไปหน้า 3 แล้วหน้า 2 ไม่ถูกโหลดเลย
  it("advances one page when called twice from the same closure", () => {
    const { hook, pages } = fakeListHook(5);
    const { result } = renderHook(() =>
      useLookupPagination({ useListHook: hook, search: "", perpage: PERPAGE }),
    );
    const loadMore = result.current.loadMore;

    act(() => {
      loadMore();
      loadMore();
    });

    expect(pages).toEqual([1, 2]);
    expect(result.current.items.map((r) => r.id)).toEqual([
      "p1-0",
      "p1-1",
      "p2-0",
      "p2-1",
    ]);
  });

  it("keeps advancing on later calls from a fresh closure", () => {
    const { hook, pages } = fakeListHook(5);
    const { result } = renderHook(() =>
      useLookupPagination({ useListHook: hook, search: "", perpage: PERPAGE }),
    );

    act(() => result.current.loadMore());
    act(() => result.current.loadMore());

    expect(pages).toEqual([1, 2, 3]);
    expect(result.current.items).toHaveLength(6);
  });

  it("does not go past the last page", () => {
    const { hook, pages } = fakeListHook(2);
    const { result } = renderHook(() =>
      useLookupPagination({ useListHook: hook, search: "", perpage: PERPAGE }),
    );

    act(() => result.current.loadMore());
    expect(result.current.hasMore).toBe(false);
    act(() => result.current.loadMore());

    expect(pages).toEqual([1, 2]);
  });
});
