
import { useCallback, useSyncExternalStore } from "react";

const URL_CHANGE_EVENT = "useurl:change";

/**
 * อ่านค่า query parameter จาก URL ปัจจุบัน
 *
 * helper สำหรับ `getSnapshot` ของ `useSyncExternalStore`
 * ใช้ `URLSearchParams` parse `window.location.search`
 *
 * @param paramName - ชื่อ parameter
 * @param defaultValue - ค่าเริ่มต้นหากไม่พบ
 * @returns ค่าของ parameter
 * @example
 * ```ts
 * const search = getURLParam("search", "");
 * ```
 */
function getURLParam(paramName: string, defaultValue: string): string {
  return (
    new URLSearchParams(window.location.search).get(paramName) ?? defaultValue
  );
}

type URLStateOptions = {
  defaultValue?: string;
  onUpdate?: (value: string) => void;
};

/**
 * Hook sync state กับ URL query parameter ผ่าน `useSyncExternalStore`
 *
 * ใช้เป็น source of truth ของ filter/search/pagination บน list page
 * subscribe `popstate` + custom event `useurl:change` เพื่อ trigger re-render
 * เมื่อ URL เปลี่ยน update ใช้ `history.replaceState` (ไม่เพิ่ม history entry)
 * และยิง custom event ให้ instance อื่น ๆ sync ตาม
 *
 * @param paramName - ชื่อ query parameter
 * @param options - default value และ callback onUpdate
 * @returns tuple [value, updateValue]
 * @example
 * ```ts
 * const [search, setSearch] = useURL("search", { defaultValue: "" });
 * setSearch("vendor-a");
 * ```
 */
export const useURL = (paramName: string, options: URLStateOptions = {}) => {
  const { defaultValue = "", onUpdate } = options;

  const subscribe = useCallback(
    (callback: () => void) => {
      window.addEventListener("popstate", callback);
      window.addEventListener(URL_CHANGE_EVENT, callback);
      return () => {
        window.removeEventListener("popstate", callback);
        window.removeEventListener(URL_CHANGE_EVENT, callback);
      };
    },
    [],
  );

  const getSnapshot = useCallback(
    () => getURLParam(paramName, defaultValue),
    [paramName, defaultValue],
  );

  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const updateValue = (newValue: string) => {
    const url = new URL(window.location.href);
    if (newValue) {
      url.searchParams.set(paramName, newValue);
    } else {
      url.searchParams.delete(paramName);
    }

    // Build search string ด้วย encodeURIComponent (space → `%20` ตาม RFC 3986)
    // แทนการใช้ url.search ที่ URLSearchParams encode space เป็น `+`
    const search = Array.from(url.searchParams.entries())
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    const nextHref = `${url.origin}${url.pathname}${search ? `?${search}` : ""}${url.hash}`;

    if (nextHref !== window.location.href) {
      window.history.replaceState(
        { ...window.history.state },
        "",
        nextHref,
      );
      window.dispatchEvent(new CustomEvent(URL_CHANGE_EVENT));
    }

    onUpdate?.(newValue);
  };

  return [value, updateValue] as const;
};
