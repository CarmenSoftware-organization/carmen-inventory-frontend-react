import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { useAppConfigByKey, useUpsertAppConfig } from "@/hooks/use-app-config";
import {
  useAppUserConfigByKey,
  useUpsertAppUserConfig,
} from "@/hooks/use-app-user-config";
import { useCan } from "@/hooks/use-can";
import { useProfile } from "@/hooks/use-profile";
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
 * `views` ทั้งหมดอยู่ข้างใน — mutation ทุกตัวเป็น **read-modify-write**: อ่าน
 * array ปัจจุบันจาก React Query cache, แก้เฉพาะ view ที่เกี่ยว, แล้วเขียนทั้ง
 * array กลับทีเดียว ไม่ต้อง `queryClient.fetchQuery` บังคับ refetch ก่อนเขียน
 * เพราะ backend เป็น last-write-wins ต่อ key อยู่แล้ว และ key แยกต่อหน้า/ต่อ
 * user แล้ว (ชนกันเฉพาะ 2 แท็บของ user เดียวกันแก้ view เดียวกันพร้อมกัน ซึ่ง
 * เป็นเคสที่ยอมรับความเสี่ยงได้)
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

  const writeViews = async (scope: ViewScope, next: SavedView[]) => {
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
    const base = scope === "bu" ? buViews : userViews;
    const view: SavedView = {
      id: crypto.randomUUID(),
      name,
      filters: snapshot.filters,
      sort: snapshot.sort,
      created_at: new Date().toISOString(),
      created_by_id: userId,
    };
    await writeViews(scope, [...base, view]);
    toast.success(t("saved", { name }));
    return view;
  };

  /** เขียนทับ filters/sort ของ view เดิม (id/name/created_* คงเดิม) */
  const update = async (
    viewId: string,
    scope: ViewScope,
    snapshot: ViewSnapshot,
  ): Promise<void> => {
    const base = scope === "bu" ? buViews : userViews;
    const next = base.map((v) =>
      v.id === viewId
        ? { ...v, filters: snapshot.filters, sort: snapshot.sort }
        : v,
    );
    await writeViews(scope, next);
    toast.success(t("updated"));
  };

  /** เปลี่ยนแค่ชื่อ view — filters/sort เดิมไม่แตะ */
  const rename = async (
    viewId: string,
    scope: ViewScope,
    name: string,
  ): Promise<void> => {
    const base = scope === "bu" ? buViews : userViews;
    const next = base.map((v) => (v.id === viewId ? { ...v, name } : v));
    await writeViews(scope, next);
    toast.success(t("renamed"));
  };

  /** ลบ view ออกจาก array ของ scope นั้น */
  const remove = async (viewId: string, scope: ViewScope): Promise<void> => {
    const base = scope === "bu" ? buViews : userViews;
    const next = base.filter((v) => v.id !== viewId);
    await writeViews(scope, next);
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
