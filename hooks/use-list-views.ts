import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { useBuCode } from "@/hooks/use-bu-code";
import {
  fetchAppConfigByKey,
  useAppConfigByKey,
  useUpsertAppConfig,
} from "@/hooks/use-app-config";
import {
  fetchAppUserConfigByKey,
  useAppUserConfigByKey,
  useUpsertAppUserConfig,
} from "@/hooks/use-app-user-config";
import { useCan } from "@/hooks/use-can";
import { useProfile } from "@/hooks/use-profile";
import { QUERY_KEYS } from "@/constant/query-keys";
import {
  listViewsConfigKey,
  MAX_VIEWS_PER_KEY,
  type ListViewsConfigValue,
  type SavedView,
  type ViewScope,
} from "@/types/list-view";
import type { ListPageKey } from "@/constant/list-page-keys";

/** ค่าที่ต้อง snapshot ตอน save/update view — ตรงกับ `filterParam`/`sortParam` ของ useListFilters */
interface ViewSnapshot {
  filters: Record<string, string>;
  sort?: string;
}

export interface UseListViewsResult {
  userViews: SavedView[];
  buViews: SavedView[];
  isLoading: boolean;
  /** true = ยังมี query ใด query หนึ่ง (bu หรือ user) กำลัง fetch/refetch อยู่ —
   * ต่างจาก `isLoading` (initial load เท่านั้น) ตรงที่ครอบคลุม refetch หลัง
   * invalidation ด้วย (เช่นตอน saveAs แล้ว query ยัง refetch ค้างอยู่) */
  isFetching: boolean;
  error: Error | null;
  /** true = admin ของ BU ปัจจุบัน — UI ใช้เพื่อโชว์ปุ่มจัดการ bu-scope view */
  canManageBu: boolean;
  saveAs: (
    name: string,
    scope: ViewScope,
    snapshot: ViewSnapshot,
  ) => Promise<SavedView>;
  update: (
    viewId: string,
    scope: ViewScope,
    snapshot: ViewSnapshot,
  ) => Promise<void>;
  rename: (viewId: string, scope: ViewScope, name: string) => Promise<void>;
  remove: (viewId: string, scope: ViewScope) => Promise<void>;
}

/**
 * Hook รวม saved views ของหน้า list หนึ่งหน้า จากสอง scope: `user` (ส่วนตัว ผูกกับ
 * ผู้ใช้คนเดียว) และ `bu` (องค์กร ผูกกับ business unit ทุกคนเห็นเหมือนกัน)
 *
 * แต่ละ scope เก็บเป็น app-config key เดียว (`list_views_<pageKey>`) ที่มี array
 * `views` ทั้งหมดอยู่ข้างใน — mutation ทุกตัวเป็น **read-modify-write** แต่ "read"
 * ไม่ใช้ React Query cache ที่ render อยู่ตรง ๆ (อาจ stale ได้ถึง 30 นาทีตาม
 * `CACHE_STATIC`) เพราะ backend ไม่มี OCC (`doc_version`) คอยกันชนให้ — ก่อนเขียน
 * ทุกครั้ง `writeViews` จะ `queryClient.fetchQuery` บังคับ fetch ใหม่ (staleTime: 0)
 * แล้วแก้ไข "ผลลัพธ์สดนั้น" ก่อนเขียนทับกลับ (last-write-wins ต่อ key เหมือนเดิม
 * แค่ลดหน้าต่างที่สอง client เห็น snapshot คนละเวลากันแล้วเขียนทับกันเอง)
 *
 * @param pageKey - identity ถาวรของหน้า list (ดู `LIST_PAGE_KEYS`) — ห้ามเปลี่ยน
 * ค่าที่ ship แล้วเพราะ view ที่ลูกค้าบันทึกไว้จะหาไม่เจอ
 * @returns `userViews`/`buViews`, สถานะ loading/error, `canManageBu` (ดูสิทธิ์
 * เท่านั้น — hook นี้ไม่บังคับ ปล่อยให้ caller เช็คก่อนเรียก `update`/`remove`
 * scope `"bu"`) และเมธอด CRUD ทั้งหมด
 * @example
 * ```ts
 * const { userViews, buViews, saveAs } = useListViews(LIST_PAGE_KEYS.VENDOR);
 * const view = await saveAs("My view", "user", { filters: { status: "active" } });
 * ```
 */
export function useListViews(pageKey: ListPageKey): UseListViewsResult {
  const key = listViewsConfigKey(pageKey);
  const buCode = useBuCode();
  const queryClient = useQueryClient();
  const buQuery = useAppConfigByKey(key);
  const userQuery = useAppUserConfigByKey(key);
  const upsertBu = useUpsertAppConfig();
  const upsertUser = useUpsertAppUserConfig();
  const { isAdmin } = useCan();
  const { userId } = useProfile();
  const t = useTranslations("listView");

  const readViews = (value: unknown): SavedView[] =>
    (value as ListViewsConfigValue | undefined)?.views ?? [];

  const buViews = readViews(buQuery.data?.value);
  const userViews = readViews(userQuery.data?.value);

  /** ตัดคีย์ค่าว่าง/เว้นวรรคออกจาก snapshot ก่อนเก็บลง saved view — กัน filter
   * chip ว่าง ๆ ค้างอยู่ใน view (จุดเดียว ผู้เรียกทั้ง 28 จุดยังส่ง `lf.values`
   * ทั้งก้อนมาเหมือนเดิม ไม่ต้องแก้ที่เรียก) */
  const normalizeFilters = (
    filters: Record<string, string>,
  ): Record<string, string> =>
    Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v.trim() !== ""),
    );

  /** อ่าน array ของ scope นั้นแบบ fresh เสมอ (บังคับ network fetch ด้วย
   * `staleTime: 0` ผ่าน queryFn เดียวกับที่ query hook ของ scope นั้นใช้จริง
   * ไม่ copy logic) แทนการอ่านจาก cache ที่ render อยู่ (`buViews`/`userViews`
   * ด้านบน) ซึ่งอาจ stale ได้ถึง 30 นาทีตาม `CACHE_STATIC` — ดู note บนสุดของไฟล์ */
  const fetchFreshViews = async (scope: ViewScope): Promise<SavedView[]> => {
    if (!buCode) return scope === "bu" ? buViews : userViews;
    const value =
      scope === "bu"
        ? await queryClient.fetchQuery({
            queryKey: [QUERY_KEYS.APP_CONFIGS, buCode, key],
            queryFn: () => fetchAppConfigByKey(buCode, key),
            staleTime: 0,
          })
        : await queryClient.fetchQuery({
            queryKey: [QUERY_KEYS.APP_USER_CONFIGS, buCode, key],
            queryFn: () => fetchAppUserConfigByKey(buCode, key),
            staleTime: 0,
          });
    return readViews(value.value);
  };

  /** fetch fresh → แก้ไขด้วย `modify` → เขียนทับกลับ (ดู `fetchFreshViews`) */
  const writeViews = async (
    scope: ViewScope,
    modify: (fresh: SavedView[]) => SavedView[],
  ) => {
    const fresh = await fetchFreshViews(scope);
    const next = modify(fresh);
    if (next.length > MAX_VIEWS_PER_KEY) {
      toast.error(t("limitReached", { max: MAX_VIEWS_PER_KEY }));
      throw new Error("view limit reached");
    }
    const value = { views: next } satisfies ListViewsConfigValue;
    if (scope === "bu") {
      await upsertBu.mutateAsync({ key, value });
    } else {
      await upsertUser.mutateAsync({ key, value });
    }
  };

  const saveAs = async (
    name: string,
    scope: ViewScope,
    snapshot: ViewSnapshot,
  ): Promise<SavedView> => {
    const view: SavedView = {
      id: crypto.randomUUID(),
      name,
      filters: normalizeFilters(snapshot.filters),
      sort: snapshot.sort,
      created_at: new Date().toISOString(),
      created_by_id: userId,
    };
    await writeViews(scope, (fresh) => [...fresh, view]);
    toast.success(t("saved", { name }));
    return view;
  };

  /** เขียนทับ filters/sort ของ view เดิม (id/name/created_* คงเดิม) */
  const update = async (
    viewId: string,
    scope: ViewScope,
    snapshot: ViewSnapshot,
  ): Promise<void> => {
    const filters = normalizeFilters(snapshot.filters);
    await writeViews(scope, (fresh) =>
      fresh.map((v) =>
        v.id === viewId ? { ...v, filters, sort: snapshot.sort } : v,
      ),
    );
    toast.success(t("updated"));
  };

  /** เปลี่ยนแค่ชื่อ view — filters/sort เดิมไม่แตะ */
  const rename = async (
    viewId: string,
    scope: ViewScope,
    name: string,
  ): Promise<void> => {
    await writeViews(scope, (fresh) =>
      fresh.map((v) => (v.id === viewId ? { ...v, name } : v)),
    );
    toast.success(t("renamed"));
  };

  /** ลบ view ออกจาก array ของ scope นั้น */
  const remove = async (viewId: string, scope: ViewScope): Promise<void> => {
    await writeViews(scope, (fresh) => fresh.filter((v) => v.id !== viewId));
    toast.success(t("deleted"));
  };

  return {
    userViews,
    buViews,
    isLoading: buQuery.isLoading || userQuery.isLoading,
    isFetching: buQuery.isFetching || userQuery.isFetching,
    error: buQuery.error ?? userQuery.error,
    canManageBu: isAdmin,
    saveAs,
    update,
    rename,
    remove,
  };
}
