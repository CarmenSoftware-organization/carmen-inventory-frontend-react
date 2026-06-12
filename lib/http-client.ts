import { ApiError, ERROR_CODES } from "@/lib/api-error";
import { refreshTokens } from "@/lib/auth/auth-api";
import { tokenStore } from "@/lib/auth/token-store";
import { getRuntimeConfig } from "@/lib/runtime-config";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions extends Omit<RequestInit, "method" | "body"> {
  body?: unknown;
}

// ---------------------------------------------------------------------------
// Client-side sliding-window rate limiter
// Prevents runaway loops from flooding the backend.
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 10_000; // 10 seconds
const RATE_LIMIT_MAX_REQUESTS = 50; // max requests per window

const requestTimestamps: number[] = [];

/**
 * ตรวจสอบ client-side rate limit แบบ sliding window
 *
 * Throw ApiError เมื่อเกินจำนวนที่กำหนดในช่วง window
 *
 * @returns void (ไม่คืนค่า แต่ throw เมื่อเกิน limit)
 * @throws {ApiError} ที่มี code RATE_LIMITED เมื่อเกิน limit
 * @example
 * ```ts
 * checkRateLimit(); // throws หากเกิน 50 req ต่อ 10s
 * ```
 */
const checkRateLimit = (): void => {
  const now = Date.now();
  // Remove timestamps outside the window
  while (
    requestTimestamps.length > 0 &&
    requestTimestamps[0] <= now - RATE_LIMIT_WINDOW_MS
  ) {
    requestTimestamps.shift();
  }

  if (requestTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    throw new ApiError(
      ERROR_CODES.RATE_LIMITED,
      "Too many requests — please slow down",
      429,
      true,
    );
  }

  requestTimestamps.push(now);
};

/**
 * แปลง error ใดๆ ที่เกิดขึ้นระหว่าง fetch ให้เป็น ApiError
 *
 * จำแนกเป็น TIMEOUT (AbortError) หรือ NETWORK_ERROR
 *
 * @param error - error object ดิบจาก fetch
 * @returns ApiError ที่จำแนกประเภทแล้ว
 * @example
 * ```ts
 * try { await fetch(url); } catch (e) { throw toApiError(e); }
 * ```
 */
const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;
  const isTimeout =
    error instanceof DOMException && error.name === "AbortError";
  return new ApiError(
    isTimeout ? ERROR_CODES.TIMEOUT : ERROR_CODES.NETWORK_ERROR,
    isTimeout
      ? "Request timed out — please try again"
      : "Network error — please check your connection",
    undefined,
    true,
  );
};

const PROXY_PREFIX = "/api/proxy/";
const EXTERNAL_PREFIX = "/api/external/";

/**
 * แปลง path เดิมของ Next server ให้ชี้ backend ตรง:
 *   /api/proxy/<rest>    → ${BACKEND_URL}/<rest>
 *   /api/external/<rest> → ${BACKEND_URL}/<rest>
 *   /api/<rest>          → ${BACKEND_URL}/api/<rest>   (เช่น /api/auth/*)
 * ทำให้ API_ENDPOINTS และ hooks ทั้งหมดใช้ต่อได้โดยไม่แก้
 */
const resolveUrl = (url: string): string => {
  const { BACKEND_URL } = getRuntimeConfig();
  if (url.startsWith(PROXY_PREFIX)) {
    return `${BACKEND_URL}/${url.slice(PROXY_PREFIX.length)}`;
  }
  if (url.startsWith(EXTERNAL_PREFIX)) {
    return `${BACKEND_URL}/${url.slice(EXTERNAL_PREFIX.length)}`;
  }
  if (url.startsWith("/api/")) {
    return `${BACKEND_URL}${url}`;
  }
  throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Invalid request URL", 400);
};

const buildAuthHeaders = (): Record<string, string> => {
  const { X_APP_ID } = getRuntimeConfig();
  const token = tokenStore.get();
  return {
    "x-app-id": X_APP_ID,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/**
 * fetch ที่ resolve URL ไป backend ตรง แนบ auth headers สดทุกครั้ง
 * แล้วจับ network error แปลงเป็น ApiError ให้เรียบร้อย
 *
 * แนบ header สดต่อ attempt (เพื่อให้ retry หลัง refresh ได้ token ใหม่)
 * โดย header ที่ caller ส่งมาชนะเมื่อ key ซ้ำกัน
 *
 * @param url - URL เดิม (root-relative /api/...) ที่จะ resolve แล้ว fetch
 * @param init - RequestInit options
 * @returns Response object
 * @throws {ApiError} เมื่อ URL ไม่ถูกต้อง, network error หรือ timeout
 * @example
 * ```ts
 * const res = await safeFetch("/api/proxy/users", { method: "GET" });
 * ```
 */
const safeFetch = async (url: string, init: RequestInit): Promise<Response> => {
  const target = resolveUrl(url);
  const finalInit: RequestInit = {
    ...init,
    headers: { ...buildAuthHeaders(), ...(init.headers as Record<string, string>) },
  };
  try {
    return await fetch(target, finalInit);
  } catch (error) {
    throw toApiError(error);
  }
};

/**
 * ส่ง CustomEvent "permission-denied" ไปยัง window เพื่อให้ `PermissionDeniedDialog`
 * แสดง ครอบทั้งกรณี API คืน 403 และ 401 ที่มี message เกี่ยวกับ permission
 *
 * Event shape ตรงกับที่ `components/permission-denied-dialog.tsx` คาดไว้
 * (detail = { permission?, message? }) — ใช้ dialog เดียวกันทั่วทั้งระบบ
 *
 * @param message - ข้อความที่จะแสดง (optional)
 * @returns void
 * @example
 * ```ts
 * dispatchAuthError("No permission");
 * ```
 */
const dispatchAuthError = (message?: string) => {
  if (
    typeof globalThis.window !== "undefined" &&
    typeof globalThis.window.dispatchEvent === "function"
  ) {
    globalThis.window.dispatchEvent(
      new CustomEvent("permission-denied", { detail: { message } }),
    );
  }
};

/**
 * พยายามอ่าน message จาก error response body
 *
 * ใช้ clone() เพื่อไม่ consume body ให้ caller ใช้ต่อได้
 * คืน undefined หาก parse ล้มเหลว
 *
 * @param response - Response object ที่เป็น error
 * @returns ข้อความ error หรือ undefined
 * @example
 * ```ts
 * const msg = await readErrorMessage(response);
 * ```
 */
const readErrorMessage = async (
  response: Response,
): Promise<string | undefined> => {
  try {
    const body = await response.clone().json();
    return body?.message;
  } catch {
    return undefined;
  }
};

/**
 * จัดการ error responses ฝั่ง client: 401, 403, 429
 *
 * - 401: พยายาม refresh token และลองใหม่ หรือแจ้ง session expired
 * - 403: แจ้ง forbidden event และ throw ApiError
 * - 429: throw rate-limited error
 *
 * @param response - Response ดิบจาก fetch
 * @param url - URL เดิมสำหรับ retry หลัง refresh
 * @param init - RequestInit options เดิม
 * @returns Response ที่ handle แล้ว (อาจเป็น retry response)
 * @throws {ApiError} เมื่อ auth ล้มเหลวหรือ rate limited
 * @example
 * ```ts
 * const finalRes = await handleClientErrors(res, url, init);
 * ```
 */
const handleClientErrors = async (
  response: Response,
  url: string,
  init: RequestInit,
): Promise<Response> => {
  // /api/external/* เป็น public endpoint (เช่น price-list ผ่าน url_token) — ไม่มี
  // session ให้ refresh/clear การดัก 401 จะกลืน HttpError ของ hook ทำให้ branch
  // "ลิงก์หมดอายุ" กลายเป็น dead code และ retry วน refresh บนหน้า public ปล่อยให้
  // raw response ไปถึง handleResponse ของ hook เอง
  if (url.startsWith(EXTERNAL_PREFIX)) return response;

  if (response.status === 401) {
    const message = await readErrorMessage(response);
    const isPermission = message?.toLowerCase().includes("permission");

    if (isPermission) {
      dispatchAuthError(message);
      throw new ApiError(ERROR_CODES.FORBIDDEN, message!, 403);
    }

    const refreshed = await refreshTokens();
    if (refreshed) return safeFetch(url, init);

    tokenStore.clear();
    throw new ApiError(ERROR_CODES.UNAUTHORIZED, "Session expired", 401);
  }

  if (response.status === 403) {
    const message = await readErrorMessage(response);
    dispatchAuthError(message);
    throw new ApiError(
      ERROR_CODES.FORBIDDEN,
      message || "Access denied",
      403,
    );
  }

  if (response.status === 429) {
    const body = await response
      .clone()
      .json()
      .catch(() => ({}) as Record<string, unknown>);
    const retryAfter =
      typeof body?.retry_after === "number" ? body.retry_after : undefined;
    const message =
      typeof body?.message === "string"
        ? body.message
        : "Too many requests — try again later";
    throw new ApiError(ERROR_CODES.RATE_LIMITED, message, 429, true, {
      retryAfter,
    });
  }

  return response;
};

/**
 * ฟังก์ชันหลักสำหรับยิง HTTP request
 *
 * ตรวจ rate limit, เพิ่ม Content-Type header, serialize body เป็น JSON
 * และจัดการ client errors โดยอัตโนมัติ
 *
 * @param url - URL ที่จะ request
 * @param method - HTTP method
 * @param options - options เพิ่มเติม (body, headers, ฯลฯ)
 * @returns Response object
 * @example
 * ```ts
 * await request("/api/proxy/users", "POST", { body: { name: "John" } });
 * ```
 */
const request = async (
  url: string,
  method: HttpMethod,
  options?: RequestOptions,
): Promise<Response> => {
  checkRateLimit();

  const { body, headers, ...rest } = options ?? {};

  // FormData (multipart) ต้องปล่อยให้ browser ตั้ง Content-Type + boundary เอง
  // และห้าม JSON.stringify — ไม่งั้น payload จะเสีย
  const isFormData = body instanceof FormData;

  const init: RequestInit = {
    method,
    ...rest,
    headers:
      body === undefined || isFormData
        ? headers
        : { "Content-Type": "application/json", ...headers },
  };

  if (body !== undefined) {
    init.body = isFormData ? body : JSON.stringify(body);
  }

  const response = await safeFetch(url, init);

  return handleClientErrors(response, url, init);
};

/**
 * HTTP client พร้อม rate limit, auto token refresh และ error normalization
 *
 * ทุก method ใช้ `request()` ภายใน จึงมี behavior เหมือนกัน
 *
 * @example
 * ```ts
 * const res = await httpClient.get("/api/proxy/vendors");
 * const res = await httpClient.post("/api/proxy/vendors", { name: "A" });
 * ```
 */
export const httpClient = {
  get: (url: string, options?: Omit<RequestOptions, "body">) =>
    request(url, "GET", options),

  post: (url: string, body?: unknown, options?: RequestOptions) =>
    request(url, "POST", { ...options, body }),

  put: (url: string, body?: unknown, options?: RequestOptions) =>
    request(url, "PUT", { ...options, body }),

  patch: (url: string, body?: unknown, options?: RequestOptions) =>
    request(url, "PATCH", { ...options, body }),

  delete: (url: string, options?: RequestOptions) =>
    request(url, "DELETE", options),
};
