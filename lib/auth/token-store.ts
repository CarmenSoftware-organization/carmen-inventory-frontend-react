/**
 * Access token เก็บใน memory เท่านั้น (หายเมื่อ reload — boot จะ refresh ให้ใหม่)
 * มี subscribe สำหรับ useSyncExternalStore เพื่อให้ RequireAuth redirect อัตโนมัติ
 * เมื่อ session หมดอายุ (http-client เรียก clear())
 */
type Listener = () => void;

let accessToken: string | null = null;
const listeners = new Set<Listener>();

const notify = () => listeners.forEach((listener) => listener());

export const tokenStore = {
  get: (): string | null => accessToken,
  set: (token: string): void => {
    accessToken = token;
    notify();
  },
  clear: (): void => {
    accessToken = null;
    notify();
  },
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
