type StorageKind = "session" | "local";

/**
 * Resolve a Web Storage object SSR-safely. Returns undefined on the server or
 * when the API is unavailable/blocked (e.g. private mode), so callers degrade
 * gracefully instead of throwing.
 */
function getStore(kind: StorageKind): Storage | undefined {
  const store =
    kind === "session" ? globalThis.sessionStorage : globalThis.localStorage;
  if (store === undefined) return undefined;
  if (typeof store.getItem !== "function") return undefined;
  return store;
}

function getItem<T>(kind: StorageKind, key: string): T | undefined {
  const store = getStore(kind);
  if (store === undefined) return undefined;
  const raw = store.getItem(key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function setItem<T>(kind: StorageKind, key: string, value: T): void {
  const store = getStore(kind);
  if (store === undefined) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded / private mode — ignore
  }
}

export function getSessionItem<T>(key: string): T | undefined {
  return getItem<T>("session", key);
}

export function setSessionItem<T>(key: string, value: T): void {
  setItem("session", key, value);
}

export function removeSessionItem(key: string): void {
  getStore("session")?.removeItem(key);
}

export function getLocalItem<T>(key: string): T | undefined {
  return getItem<T>("local", key);
}

export function setLocalItem<T>(key: string, value: T): void {
  setItem("local", key, value);
}
