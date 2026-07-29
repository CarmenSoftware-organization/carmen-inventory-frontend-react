import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { setURLParams, useURL, URL_CHANGE_EVENT } from "@/hooks/use-url";
import { useListViews, type UseListViewsResult } from "@/hooks/use-list-views";
import {
  encodeFilterParam,
  viewMatchesCurrent,
} from "@/lib/list-filter-encode";
import type { ActiveFilter } from "@/components/ui/active-filter-bar";
import type { FilterFieldDef } from "@/types/list-filter";
import type { SavedView, ViewScope } from "@/types/list-view";
import type { ListPageKey } from "@/constant/list-page-keys";

export interface UseListFiltersOptions {
  pageKey: ListPageKey;
  /** field ที่จะ render เป็น filter chip/sheet — ดู note เรื่อง reference stability ที่ `useURLValues` */
  fields: readonly FilterFieldDef[];
  /**
   * sort ที่หน้าใช้เมื่อ URL ไม่มี `sort` param — เก็บไว้เป็นข้อมูลอ้างอิงให้ caller
   * เท่านั้น (เช่น โชว์ label "เรียงตาม: ชื่อ (ค่าเริ่มต้น)") hook นี้ไม่ต้องใช้ค่านี้เอง
   * เพราะ `sortParam`/`viewMatchesCurrent` ถือว่า `""` และ `undefined` คือ "default" อยู่แล้ว
   */
  defaultSort?: string;
}

export interface UseListFiltersResult {
  values: Record<string, string>;
  /** เขียนค่า filter field หนึ่งตัวลง URL แล้วรีเซ็ต page กลับหน้าแรก */
  setValue: (key: string, value: string) => void;
  /** ล้างทุก filter field + saved-view ที่กำลัง apply (`sv`) + page */
  clearAll: () => void;
  filterParam: string | undefined;
  /** ค่า `sort` ดิบจาก URL — `""` แปลว่าใช้ default sort ของหน้า */
  sortParam: string;
  activeFilters: ActiveFilter[];
  view: {
    current: SavedView | null;
    scope: ViewScope | null;
    isDirty: boolean;
    /** เขียน filters + sort + sv ทับ URL ทั้งชุดแบบอะตอมมิก (ล้าง field เดิมก่อนเสมอ) */
    apply: (view: SavedView) => void;
    /** ล้างแค่ `sv` — filter ที่แก้ไว้ยังอยู่ (กลายเป็น "unsaved" ไม่ผูก view ไหน) */
    clear: () => void;
    /** เขียนค่าของ view ปัจจุบันทับ URL อีกรอบ (ใช้ปุ่ม "Discard changes") */
    revert: () => void;
  } & UseListViewsResult;
}

/**
 * อ่านค่า URL query param ของหลาย key พร้อมกันด้วย `useSyncExternalStore` ตัวเดียว
 *
 * ทำไมไม่เรียก `useURL` วน loop ทีละ key: จำนวน field เปลี่ยนได้ตาม `fields` ที่รับมา
 * (เรียก hook จำนวนไม่คงที่ = ผิด rules-of-hooks) จึง subscribe เหตุการณ์เดียว
 * (`popstate` + `useurl:change`) แล้ว snapshot ทุก key พร้อมกันเป็น "สตริงเดียว"
 * (`JSON.stringify` ของ array ค่า) เพื่อให้ `useSyncExternalStore` เทียบผลลัพธ์ด้วย
 * `Object.is` ได้ถูกต้อง — **ไม่** join ด้วย separator character (เช่น เว้นวรรค)
 * เพราะค่าที่ decode มาจาก URL อาจมีอักขระอะไรก็ได้ปนมา รวมถึงตัวที่เลือกเป็น
 * separator เอง ทำให้ split ตอนอ่านกลับผิดคู่แบบเงียบ ๆ ส่วน string ที่ได้จาก
 * `JSON.stringify` เทียบกัน by value อยู่แล้ว (primitive) จึงไม่มีปัญหานี้
 *
 * @param keys - รายชื่อ query param — **ควรเป็น reference คงที่ข้าม render**
 * (module-level array หรือผ่าน `useMemo`) ไม่งั้น subscribe/unsubscribe ใหม่ทุก
 * render โดยไม่จำเป็น (ความถูกต้องของค่ายังอยู่เพราะเทียบ string by value แต่เสีย
 * perf และเสี่ยง event หลุดช่วง re-subscribe)
 * @returns Record ของ key -> ค่าปัจจุบันใน URL (ไม่พบ = "")
 */
function useURLValues(keys: readonly string[]): Record<string, string> {
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener("popstate", callback);
    window.addEventListener(URL_CHANGE_EVENT, callback);
    return () => {
      window.removeEventListener("popstate", callback);
      window.removeEventListener(URL_CHANGE_EVENT, callback);
    };
  }, []);

  const getSnapshot = useCallback(() => {
    const sp = new URLSearchParams(window.location.search);
    return JSON.stringify(keys.map((k) => sp.get(k) ?? ""));
  }, [keys]);

  const getServerSnapshot = useCallback(
    () => JSON.stringify(keys.map(() => "")),
    [keys],
  );

  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return useMemo(() => {
    const parts: string[] = JSON.parse(snapshot);
    return Object.fromEntries(keys.map((k, i) => [k, parts[i] ?? ""]));
  }, [snapshot, keys]);
}

/**
 * Hook รวม state ของ filter sheet หน้า list หนึ่งหน้า — URL คือ source of truth เดียว
 * (ไม่มี local state ซ้ำ) ครอบคลุมค่า filter ดิบทุก field, sort, encode เป็น backend
 * filter param, active-filter chip และการ apply/revert saved view (`useListViews`)
 *
 * Flow คร่าว ๆ: อ่านค่าทุก field จาก URL (`useURLValues`) → encode เป็น `filterParam`
 * ให้ query hook ของหน้าใช้ยิง backend ตรง ๆ → เทียบกับ saved view ที่ `sv` ชี้ (ถ้ามี)
 * เพื่อคำนวณ `isDirty` → ถ้า `sv` ชี้ view ที่หาไม่เจอ (ถูกลบไปแล้ว/ลิงก์เก่า) เตือน
 * ครั้งเดียวแล้วล้าง `sv` ทิ้งเงียบ ๆ (ดู effect ท้ายฟังก์ชัน)
 *
 * @param options - `pageKey` (identity ของหน้า ดู `LIST_PAGE_KEYS`), `fields`
 * (นิยาม filter field ของหน้า — **ต้องเป็น reference คงที่** ดู `useURLValues`),
 * `defaultSort` (ข้อมูลอ้างอิงเฉย ๆ ดู `UseListFiltersOptions`)
 * @returns ค่า filter ปัจจุบัน, setter, chip สำหรับแสดงผล และ `view.*` (saved-view
 * ที่กำลัง apply อยู่ + CRUD ทั้งหมดจาก `useListViews`)
 * @example
 * ```ts
 * const { values, setValue, filterParam, view } = useListFilters({
 *   pageKey: LIST_PAGE_KEYS.VENDOR,
 *   fields: VENDOR_FILTER_FIELDS,
 * });
 * const { data } = useVendor({ filter: filterParam });
 * ```
 */
export function useListFilters(
  options: UseListFiltersOptions,
): UseListFiltersResult {
  const { pageKey, fields } = options;
  const t = useTranslations();

  const fieldKeys = useMemo(() => fields.map((f) => f.key), [fields]);
  const values = useURLValues(fieldKeys);
  const [sortRaw] = useURL("sort");
  const [sv] = useURL("sv");
  const views = useListViews(pageKey);

  const setValue = useCallback(
    (key: string, value: string) => setURLParams({ [key]: value, page: "" }),
    [],
  );

  const clearAll = useCallback(() => {
    setURLParams({
      ...Object.fromEntries(fieldKeys.map((k) => [k, ""])),
      sv: "",
      page: "",
    });
  }, [fieldKeys]);

  const filterParam = encodeFilterParam(fields, values);

  const activeFilters: ActiveFilter[] = useMemo(
    () =>
      fields
        .filter((f) => !!values[f.key]?.trim())
        .map((f) => ({
          key: f.key,
          label: t(f.labelKey),
          onRemove: () => setValue(f.key, ""),
        })),
    [fields, values, t, setValue],
  );

  const current: SavedView | null = sv
    ? ([...views.userViews, ...views.buViews].find((v) => v.id === sv) ?? null)
    : null;
  const scope: ViewScope | null = current
    ? views.userViews.some((v) => v.id === current.id)
      ? "user"
      : "bu"
    : null;
  const isDirty = !!current && !viewMatchesCurrent(current, values, sortRaw);

  const apply = useCallback(
    (view: SavedView) => {
      setURLParams({
        ...Object.fromEntries(fieldKeys.map((k) => [k, ""])),
        ...view.filters,
        sort: view.sort ?? "",
        sv: view.id,
        page: "",
      });
    },
    [fieldKeys],
  );

  const clear = useCallback(() => setURLParams({ sv: "" }), []);
  const revert = useCallback(() => {
    if (current) apply(current);
  }, [current, apply]);

  // Step 3: `sv` ชี้ view ที่หาไม่เจอ (ถูกลบ/ลิงก์ที่แชร์มาเก่าแล้ว) — เตือนครั้งเดียว
  // ด้วย ref guard แล้วล้าง `sv` ทิ้งเงียบ ๆ ต้องรอ `views.isLoading` เป็น false ก่อน
  // ไม่งั้นระหว่างโหลด (ยังไม่มี userViews/buViews มาเทียบ) จะเข้าใจผิดว่า "หาไม่เจอ"
  const notFoundHandledRef = useRef(false);
  useEffect(() => {
    if (!sv) {
      notFoundHandledRef.current = false;
      return;
    }
    if (views.isLoading || notFoundHandledRef.current) return;
    if (!current) {
      notFoundHandledRef.current = true;
      toast.info(t("listView.viewNotFound"));
      setURLParams({ sv: "" });
    }
  }, [sv, views.isLoading, current, t]);

  return {
    values,
    setValue,
    clearAll,
    filterParam,
    sortParam: sortRaw,
    activeFilters,
    view: { current, scope, isDirty, apply, clear, revert, ...views },
  };
}
