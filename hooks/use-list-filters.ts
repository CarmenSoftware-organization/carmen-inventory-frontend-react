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
import { useDepartment } from "@/hooks/use-department";
import { useUser } from "@/hooks/use-user";
import { useListViews, type UseListViewsResult } from "@/hooks/use-list-views";
import {
  encodeFilterParam,
  viewMatchesCurrent,
} from "@/lib/list-filter-encode";
import type { ActiveFilter } from "@/components/ui/active-filter-bar";
import type { FilterFieldDef, FilterPeerAccess } from "@/types/list-filter";
import type { SavedView, ViewScope } from "@/types/list-view";
import type { ListPageKey } from "@/constant/list-page-keys";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

/** ค่าดิบราย id จาก clause — ตัด "col|type:" ทิ้ง (รองรับทั้ง merge และ clause ซ้ำ prefix) */
function clauseTokens(value: string): string[] {
  return value
    .split(",")
    .map((part) =>
      part.includes(":") ? part.slice(part.lastIndexOf(":") + 1) : part,
    )
    .map((v) => v.trim())
    .filter(Boolean);
}

/** ชื่อตัวแรก +N — คืน undefined เมื่อไม่มีชื่อให้โชว์ (ให้ fallback ทำงานต่อ) */
function firstPlusRest(names: readonly string[]): string | undefined {
  if (names.length === 0) return undefined;
  return names[0] + (names.length > 1 ? ` +${names.length - 1}` : "");
}

/**
 * ข้อความค่าบน chip ของ ActiveFilterBar — derive จาก field def + ค่า URL:
 * `valueText` ของ field ชนะเสมอ → options ที่ประกาศไว้ map เป็น label →
 * date_range เป็น "จาก – ถึง" → slug อ่านออกโชว์ตรง (ตัวแรก +N) →
 * id (uuid) โชว์จำนวนรายการแทน (ไม่มีชื่อให้โชว์ในชั้นนี้)
 *
 * export ให้ ListFilterMenu (desktop) ใช้โชว์ค่าย่อท้ายแถว field ด้วย —
 * ข้อความชุดเดียวกับ chip เสมอ จะได้ไม่ต้อง derive สองสูตร
 */
export function chipValueText(
  f: FilterFieldDef,
  value: string,
  t: (key: string) => string,
): string | undefined {
  if (f.valueText) return f.valueText(value);

  const options = "options" in f ? f.options : undefined;
  if (options?.length) {
    const selected = new Set(value.split(","));
    const labels = options
      .filter((o) => selected.has(o.value))
      .map((o) => t(o.labelKey));
    if (labels.length > 0) {
      return labels[0] + (labels.length > 1 ? ` +${labels.length - 1}` : "");
    }
  }

  const dateRange = /\|date_?range:([^,]+),(.+)$/.exec(value);
  if (dateRange) return `${dateRange[1]} – ${dateRange[2]}`;

  // ช่วงตัวเลข — ฝั่งเดียวโชว์เป็น ≥/≤ ให้อ่านออกว่าเปิดปลาย
  const numRange = /\|num_range:([^,]*),(.*)$/.exec(value);
  if (numRange) {
    const [, min, max] = numRange;
    if (min && max) return `${min} – ${max}`;
    return min ? `≥ ${min}` : `≤ ${max}`;
  }

  const tokens = clauseTokens(value);
  if (tokens.length === 0) return undefined;
  if (tokens.some((v) => UUID_RE.test(v))) return `${tokens.length}`;
  return firstPlusRest(tokens.map((v) => v.replace(/_/g, " ")));
}

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
    /**
     * บันทึก filter+sort ปัจจุบันเป็น view ชื่อ `name` ใน scope นั้น — ชื่อซ้ำ =
     * เขียนทับตัวเดิม, ชื่อใหม่ = สร้างใหม่ แล้ว apply ให้ URL ชี้ view นั้นเสมอ
     * ต่อตรงกับ `onSave` ของ `SaveViewDialog` ได้เลย
     */
    saveOrUpdate: (name: string, scope: ViewScope) => Promise<void>;
    /** ชื่อ view ที่มีอยู่แล้วใน scope นั้น — ให้ `SaveViewDialog` เตือนชื่อซ้ำ */
    existingNames: (scope: ViewScope) => string[];
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

  // ชื่อจริงบน chip ของ field แผนก/ผู้ขอ — fetch เฉพาะเมื่อหน้ามี field ชนิดนั้น
  // (ค่าใน clause เป็น id ล้วน ชื่ออยู่ในทะเบียนกลาง ไม่ใช่ในตัว control)
  const hasDepartmentField = fields.some((f) => f.control === "department");
  const hasRequesterField = fields.some((f) => f.control === "requester");
  const { data: departmentData } = useDepartment(
    { perpage: -1 },
    { enabled: hasDepartmentField },
  );
  const { data: userData } = useUser(
    { perpage: -1 },
    { enabled: hasRequesterField },
  );

  // ให้ chip เปิด editor inline ได้ (ดู ActiveFilterBar) — peer ชุดเดียวกับที่
  // ListFilter ส่งให้ control ใน sheet/เมนู เพื่อให้ field คู่ (linked keys) ทำงานครบ
  const peer: FilterPeerAccess = useMemo(
    () => ({ get: (key) => values[key] ?? "", set: setValue }),
    [values, setValue],
  );

  const activeFilters: ActiveFilter[] = useMemo(
    () =>
      fields
        // field hidden ไม่ผลิต chip (ดู FilterFieldDef.hidden) — ค่ายังนับใน
        // filterParam/saved-views ตามปกติ แค่ไม่โผล่ใน ActiveFilterBar
        .filter((f) => !f.hidden && !!values[f.key]?.trim())
        .map((f) => ({
          key: f.key,
          label: t(f.labelKey),
          // chip แก้ค่าได้เอง — เว้น field ที่ไม่มีชื่อ (custom เฉพาะมือถือ) ให้เป็น
          // chip อ่านอย่างเดียวตามเดิม
          ...(f.labelKey
            ? {
                field: f,
                rawValue: values[f.key],
                onChange: (v: string) => setValue(f.key, v),
                peer,
              }
            : {}),
          // ค่าซ้ำกับชื่อ field (เช่น sendback ตัวเลือกเดียว) ไม่ต้องพูดสองรอบ
          value: (() => {
            const raw = values[f.key];
            // แผนก/ผู้ขอ: id → ชื่อจริงจากทะเบียน (ระหว่างโหลดตก fallback เป็นจำนวน)
            let named: string | undefined;
            if (f.control === "department") {
              const list = departmentData?.data ?? [];
              named = firstPlusRest(
                clauseTokens(raw)
                  .map((id) => list.find((d) => d.id === id)?.name)
                  .filter((n): n is string => !!n),
              );
            } else if (f.control === "requester") {
              const list = userData?.data ?? [];
              named = firstPlusRest(
                clauseTokens(raw)
                  .map((id) => {
                    const u = list.find((usr) => usr.user_id === id);
                    return u
                      ? [u.firstname, u.middlename, u.lastname]
                          .filter(Boolean)
                          .join(" ")
                      : undefined;
                  })
                  .filter((n): n is string => !!n),
              );
            }
            const text = named ?? chipValueText(f, raw, t);
            return text === t(f.labelKey) ? undefined : text;
          })(),
          onRemove: () => {
            // field ที่มี linkedKeys (เช่น created_at_from คู่กับ created_at_to
            // ที่ถูกซ่อนไว้) ต้องล้างทั้งคู่พร้อมกันใน setURLParams ครั้งเดียว ไม่งั้น
            // key คู่จะค้างค่าเก่าไว้เดี่ยว ๆ หลังผู้ใช้กดลบแค่ chip เดียว
            if (f.linkedKeys?.length) {
              setURLParams({
                [f.key]: "",
                ...Object.fromEntries(f.linkedKeys.map((k) => [k, ""])),
                page: "",
              });
            } else {
              setValue(f.key, "");
            }
          },
        })),
    [fields, values, t, setValue, peer, departmentData, userData],
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

  const existingNames = (scope: ViewScope) =>
    (scope === "bu" ? views.buViews : views.userViews).map((v) => v.name);

  /** replace semantics: ชื่อซ้ำใน scope เดียวกัน → update ของเดิม, ไม่ซ้ำ → saveAs ใหม่
   *  (เดิมทุกหน้า list ก๊อปฟังก์ชันนี้ไว้เองคนละก๊อป — ย้ายมารวมที่นี่จุดเดียว) */
  const saveOrUpdate = async (name: string, scope: ViewScope) => {
    const list = scope === "bu" ? views.buViews : views.userViews;
    const existing = list.find((v) => v.name === name);
    const snapshot = { filters: values, sort: sortRaw || undefined };
    if (existing) {
      await views.update(existing.id, scope, snapshot);
      // อัปเดต view อื่นที่ไม่ใช่ view ปัจจุบัน — ต้อง apply ต่อให้ URL ชี้ตาม
      // (ถ้าเป็น view ปัจจุบันอยู่แล้ว ค่าจะ sync เองเมื่อ query cache รีเฟรช)
      if (existing.id !== current?.id) {
        apply({ ...existing, filters: snapshot.filters, sort: snapshot.sort });
      }
    } else {
      apply(await views.saveAs(name, scope, snapshot));
    }
  };

  // Step 3: `sv` ชี้ view ที่หาไม่เจอ (ถูกลบ/ลิงก์ที่แชร์มาเก่าแล้ว) — เตือนครั้งเดียว
  // ด้วย ref guard แล้วล้าง `sv` ทิ้งเงียบ ๆ ต้องรอทั้ง `views.isLoading` และ
  // `views.isFetching` เป็น false และไม่มี `views.error` ก่อน — ไม่งั้นระหว่างโหลด/
  // refetch (เช่นหลัง saveAs แล้ว query ถูก invalidate ยังไม่ทันมี view ใหม่ในแคช)
  // หรือตอน query error จะเข้าใจผิดว่า "หาไม่เจอ" ทั้งที่จริงยังไม่มีข้อมูลมาเทียบ
  const notFoundHandledRef = useRef(false);
  useEffect(() => {
    if (!sv) {
      notFoundHandledRef.current = false;
      return;
    }
    if (
      views.isLoading ||
      views.isFetching ||
      views.error ||
      notFoundHandledRef.current
    )
      return;
    if (!current) {
      notFoundHandledRef.current = true;
      toast.info(t("listView.viewNotFound"));
      setURLParams({ sv: "" });
    }
  }, [sv, views.isLoading, views.isFetching, views.error, current, t]);

  return {
    values,
    setValue,
    clearAll,
    filterParam,
    sortParam: sortRaw,
    activeFilters,
    view: {
      current,
      scope,
      isDirty,
      apply,
      clear,
      revert,
      saveOrUpdate,
      existingNames,
      ...views,
    },
  };
}
