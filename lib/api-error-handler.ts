/** ตัวเลือกต่อครั้งที่ส่งไปพร้อม error — มาจาก `meta` ของ mutation */
export type ReportApiErrorOptions = { readonly preferServerMessage?: boolean };

type ApiErrorHandler = (error: unknown, options?: ReportApiErrorOptions) => void;

let handler: ApiErrorHandler | null = null;

/**
 * `meta` ของ mutation ที่จัดการ error เองแล้ว ไม่ต้องการ toast กลาง
 *
 * ```ts
 * useMutation({ mutationFn, meta: { skipGlobalErrorToast: true } })
 * ```
 */
export type ApiErrorMeta = {
  readonly skipGlobalErrorToast?: boolean;
  /**
   * ให้ toast กลางแสดงข้อความจาก backend เมื่อ error **ไม่มี** `appCode` —
   * หน้าที่ backend ยังตอบเป็นข้อความดิบ (เช่น "Fiscal year/month combination
   * already exists") แทนรหัส catalog ใช้ opt-in ตัวนี้ ข้อความกลางตาม HTTP status
   * มักผิดเรื่อง (409 กลายเป็น "มีคนแก้เอกสาร") · กติกาการกรองอยู่ที่
   * `getDisplayableServerMessage`
   */
  readonly preferServerMessage?: boolean;
};

export const skipsGlobalErrorToast = (meta: unknown): boolean =>
  typeof meta === "object" &&
  meta !== null &&
  (meta as ApiErrorMeta).skipGlobalErrorToast === true;

export const prefersServerMessage = (meta: unknown): boolean =>
  typeof meta === "object" &&
  meta !== null &&
  (meta as ApiErrorMeta).preferServerMessage === true;

export const setApiErrorHandler = (next: ApiErrorHandler | null): void => {
  handler = next;
};

export const reportApiError = (
  error: unknown,
  options?: ReportApiErrorOptions,
): void => {
  // ไม่มี options ก็เรียกด้วย error ตัวเดียวเหมือนเดิม — handler เดิมไม่ต้องรู้จักพารามิเตอร์ใหม่
  if (options) handler?.(error, options);
  else handler?.(error);
};
