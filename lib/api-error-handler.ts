/**
 * ท่อส่ง error จาก MutationCache (module scope) ไปหา React
 *
 * QueryClient ถูกสร้างนอก React จึงเรียก `useTranslations` ไม่ได้ — MutationCache
 * เลยแค่ยิง error เข้ามาที่นี่ แล้ว `<ApiErrorToaster />` ที่อยู่ใน tree เป็นคน
 * ติดตั้ง handler ที่ผูก `t()` ไว้แล้ว
 */
type ApiErrorHandler = (error: unknown) => void;

let handler: ApiErrorHandler | null = null;

/**
 * `meta` ของ mutation ที่จัดการ error เองแล้ว ไม่ต้องการ toast กลาง
 *
 * ```ts
 * useMutation({ mutationFn, meta: { skipGlobalErrorToast: true } })
 * ```
 */
export type ApiErrorMeta = { readonly skipGlobalErrorToast?: boolean };

/** mutation นี้ opt-out จาก toast กลางหรือไม่ */
export const skipsGlobalErrorToast = (meta: unknown): boolean =>
  typeof meta === "object" &&
  meta !== null &&
  (meta as ApiErrorMeta).skipGlobalErrorToast === true;

/** ติดตั้ง handler — เรียกจาก `<ApiErrorToaster />` เท่านั้น (null = ถอน) */
export const setApiErrorHandler = (next: ApiErrorHandler | null): void => {
  handler = next;
};

/**
 * รายงาน error ให้ handler ที่ติดตั้งไว้
 *
 * ไม่มี handler (ยังไม่ mount / test) = เงียบ — ไม่ throw ซ้ำซ้อนใส่ caller
 */
export const reportApiError = (error: unknown): void => {
  handler?.(error);
};
