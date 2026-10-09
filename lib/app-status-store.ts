import type { AppStatusErrorCode } from "@/lib/api-error";

/**
 * สถานะการให้บริการของแอปนี้ (x-app-id) ที่แอดมินตั้งไว้ที่หน้า Applications ของ carmen-platform
 *
 * gateway เป็นคนบังคับจริง — ฝั่งนี้มีไว้ **แสดงผล** อย่างเดียว ค่าที่อ่านไม่ออกจึงตีเป็น
 * `running` เสมอ (การล็อกทั้งแอปเพราะข้อมูลเพี้ยนแย่กว่าการปล่อยให้ gateway ตอบ 503 เอง)
 */
export type AppStatus = "running" | "maintenance" | "read_only" | "disabled";

export interface AppStatusSnapshot {
  readonly status: AppStatus;
  /** ข้อความที่แอดมินพิมพ์ไว้ (ภาษาเดียว ไม่ผ่านระบบแปล) */
  readonly message?: string;
  /** เวลาที่คาดว่าจะกลับมา (ISO) — แสดงอย่างเดียว ระบบไม่สลับกลับเอง */
  readonly until?: string;
  /** ผู้ใช้คนนี้อยู่ในรายชื่อยกเว้นของแอป — ใช้ได้ปกติระหว่าง maintenance/read_only */
  readonly bypass: boolean;
}

export const APP_STATUS_RUNNING: AppStatusSnapshot = {
  status: "running",
  bypass: false,
};

const STATUSES: ReadonlySet<string> = new Set<AppStatus>([
  "running",
  "maintenance",
  "read_only",
  "disabled",
]);

const CODE_TO_STATUS: Record<AppStatusErrorCode, AppStatus> = {
  APP_MAINTENANCE: "maintenance",
  APP_READ_ONLY: "read_only",
  APP_DISABLED: "disabled",
};

const readMessage = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

const readUntil = (value: unknown): string | undefined =>
  typeof value === "string" && !Number.isNaN(Date.parse(value))
    ? value
    : undefined;

/**
 * แปลงคำตอบของ `GET /api/app-status` (หลังแกะ `{ data }` แล้ว) เป็น snapshot
 *
 * @param raw - body ชนิดอะไรก็ได้
 * @returns snapshot — รูปแปลก/สถานะที่ไม่รู้จัก = running
 * @example
 * ```ts
 * parseAppStatus({ status: "read_only", bypass: false }); // { status: "read_only", bypass: false }
 * parseAppStatus({ status: "paused" });                   // APP_STATUS_RUNNING
 * ```
 */
export function parseAppStatus(raw: unknown): AppStatusSnapshot {
  if (typeof raw !== "object" || raw === null) return APP_STATUS_RUNNING;
  const r = raw as Record<string, unknown>;
  if (typeof r.status !== "string" || !STATUSES.has(r.status)) {
    return APP_STATUS_RUNNING;
  }
  return {
    status: r.status as AppStatus,
    message: readMessage(r.message),
    until: readUntil(r.until),
    bypass: r.bypass === true,
  };
}

/**
 * ต้องแทนทั้งแอปด้วยหน้าเต็มจอหรือไม่ — disabled บล็อกทุกคน, maintenance บล็อกเฉพาะคนที่ไม่ได้รับยกเว้น
 */
export const isAppBlocked = (s: AppStatusSnapshot): boolean =>
  s.status === "disabled" || (s.status === "maintenance" && !s.bypass);

/** เวลา `until` ในรูปที่คนอ่าน — locale ของเบราว์เซอร์ เหมือน `LicenseExpiredBanner` */
export const formatAppStatusTime = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

type Listener = () => void;

let current: AppStatusSnapshot = APP_STATUS_RUNNING;
const listeners = new Set<Listener>();

const sameSnapshot = (a: AppStatusSnapshot, b: AppStatusSnapshot) =>
  a.status === b.status &&
  a.message === b.message &&
  a.until === b.until &&
  a.bypass === b.bypass;

// แทนที่เฉพาะตอนค่าเปลี่ยนจริง — useSyncExternalStore ต้องได้ object เดิมเมื่อไม่มีอะไรเปลี่ยน
// ไม่งั้น root-layout จะ re-render ทุกรอบ poll
const replace = (next: AppStatusSnapshot): void => {
  if (sameSnapshot(current, next)) return;
  current = next;
  listeners.forEach((listener) => listener());
};

/**
 * store กลางของสถานะแอป — รูปเดียวกับ `tokenStore` (subscribe สำหรับ useSyncExternalStore)
 *
 * ผู้เขียนสองทาง: `useAppStatus()` (poll — เชื่อถือได้ที่สุด เขียนทับทุกครั้ง) และ
 * `http-client` (เจอรหัสสถานะใน 503/403 ระหว่างทาง — อัปเดตทันทีไม่ต้องรอรอบ poll)
 */
export const appStatusStore = {
  get: (): AppStatusSnapshot => current,
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setFromProbe: (snapshot: AppStatusSnapshot): void => replace(snapshot),
  reportBlocked: (code: AppStatusErrorCode, body: unknown): void => {
    const error =
      typeof body === "object" && body !== null
        ? (body as { error?: Record<string, unknown> }).error
        : undefined;
    // ถูกบล็อก = ไม่ได้อยู่ในรายชื่อยกเว้นแน่นอน
    replace({
      status: CODE_TO_STATUS[code],
      message: readMessage(error?.message),
      // gateway วาง `until` ไว้ระดับบนสุดของ body ไม่ใช่ใน `error` (exception filter ตัดคีย์อื่นใน error ทิ้ง)
      until: readUntil((body as { until?: unknown }).until ?? error?.until),
      bypass: false,
    });
  },
};
