import { useCallback, useSyncExternalStore } from "react";

export const URL_CHANGE_EVENT = "useurl:change";

function getURLParam(paramName: string, defaultValue: string): string {
  return (
    new URLSearchParams(window.location.search).get(paramName) ?? defaultValue
  );
}

export function setURLParams(entries: Record<string, string>): void {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(entries)) {
    if (v) {
      url.searchParams.set(k, v);
    } else {
      url.searchParams.delete(k);
    }
  }
  const search = Array.from(url.searchParams.entries())
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const nextHref = `${url.origin}${url.pathname}${search ? `?${search}` : ""}${url.hash}`;
  if (nextHref !== window.location.href) {
    window.history.replaceState({ ...window.history.state }, "", nextHref);
    window.dispatchEvent(new CustomEvent(URL_CHANGE_EVENT));
  }
}

type URLStateOptions = {
  defaultValue?: string;
  onUpdate?: (value: string) => void;
};

export const useURL = (paramName: string, options: URLStateOptions = {}) => {
  const { defaultValue = "", onUpdate } = options;

  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener("popstate", callback);
    window.addEventListener(URL_CHANGE_EVENT, callback);
    return () => {
      window.removeEventListener("popstate", callback);
      window.removeEventListener(URL_CHANGE_EVENT, callback);
    };
  }, []);

  const getSnapshot = useCallback(
    () => getURLParam(paramName, defaultValue),
    [paramName, defaultValue],
  );

  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const updateValue = (newValue: string) => {
    setURLParams({ [paramName]: newValue });
    onUpdate?.(newValue);
  };

  return [value, updateValue] as const;
};
