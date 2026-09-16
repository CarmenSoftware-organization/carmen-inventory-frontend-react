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

export const skipsGlobalErrorToast = (meta: unknown): boolean =>
  typeof meta === "object" &&
  meta !== null &&
  (meta as ApiErrorMeta).skipGlobalErrorToast === true;

export const setApiErrorHandler = (next: ApiErrorHandler | null): void => {
  handler = next;
};

export const reportApiError = (error: unknown): void => {
  handler?.(error);
};
