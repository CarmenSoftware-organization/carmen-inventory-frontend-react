import { ApiError, ERROR_CODES, licenseErrorCodeFrom } from "@/lib/api-error";
import { refreshTokens } from "@/lib/auth/auth-api";
import { tokenStore } from "@/lib/auth/token-store";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { dispatchPermissionDenied } from "@/components/permission-denied-dialog";

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

const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;
  // AbortController.abort() → "AbortError"; AbortSignal.timeout() → "TimeoutError"
  const isTimeout =
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "TimeoutError");
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

// timeout เริ่มต้นของทุก request ที่ caller ไม่ได้ส่ง signal มาเอง — กัน request
// ค้างถาวรเมื่อ backend ไม่ตอบ caller ที่มี operation ยาว (export/report ใหญ่)
// ส่ง signal ของตัวเองมา override ได้ (เช่น AbortSignal.timeout ที่นานกว่านี้)
const DEFAULT_TIMEOUT_MS = 30_000;

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
    // signal สดต่อ attempt — retry หลัง refresh ได้ timeout window ใหม่ของตัวเอง
    signal: init.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    headers: {
      ...buildAuthHeaders(),
      ...(init.headers as Record<string, string>),
    },
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
 * อ่าน body ดิบทั้งก้อนของ error response (ใช้ clone() กันชนกับ caller ที่จะอ่านซ้ำ)
 *
 * ใช้เฉพาะจุดที่ต้องมองเข้าไปใน `error.code` (แยก license 403 จาก permission 403) —
 * `readErrorMessage` ด้านบนพอสำหรับจุดอื่นที่ต้องการแค่ข้อความ
 *
 * @returns body ที่ parse แล้ว หรือ undefined เมื่อไม่ใช่ JSON/parse ไม่ได้
 */
const readErrorBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.clone().json();
  } catch {
    return undefined;
  }
};

const handleClientErrors = async (
  response: Response,
  url: string,
  init: RequestInit,
  isRetry = false,
): Promise<Response> => {
  // /api/external/* เป็น public endpoint (เช่น price-list ผ่าน url_token) — ไม่มี
  // session ให้ refresh/clear การดัก 401 จะกลืน HttpError ของ hook ทำให้ branch
  // "ลิงก์หมดอายุ" กลายเป็น dead code และ retry วน refresh บนหน้า public ปล่อยให้
  // raw response ไปถึง handleResponse ของ hook เอง
  if (url.startsWith(EXTERNAL_PREFIX)) return response;

  if (response.status === 401) {
    // refresh + retry ก่อนเสมอ — 401 หมายถึง "token ใช้ไม่ได้" เท่านั้น
    // หลัง refresh แล้ว retry ยังได้ 401 อีก (isRetry) แปลว่า token ที่ refresh มา
    // ก็ยังถูกปฏิเสธ — ค่อยไปตัดสินด้านล่าง ไม่ refresh วนซ้ำ (กัน loop)
    if (!isRetry) {
      const refreshed = await refreshTokens();
      if (refreshed) {
        // ส่ง retry response กลับเข้า handler อีกรอบ (isRetry=true) เพื่อให้
        // 401/403/429 รอบสองถูกจัดการแทนที่จะคืน response ดิบ
        const retried = await safeFetch(url, init);
        return handleClientErrors(retried, url, init, true);
      }
    }

    // Legacy shim: gateway เก่าตอบ 401 ให้เรื่องสิทธิ์ BU ด้วย ("...do not have
    // permission for the following BU code(s)...") ซึ่งไม่ใช่ session หมดอายุ —
    // เคลียร์ session ตรงนี้จะเตะผู้ใช้ออกทั้งที่ token ยังดี gateway รุ่นใหม่ตอบ
    // 403 ให้เคสนี้แล้ว (ดู `KeycloakGuard`) ตัวนี้จึงเหลือไว้เผื่อช่วง deploy
    // คร่อมกันเท่านั้น และเช็คหลัง refresh เพื่อไม่ให้บังการ refresh ที่ควรเกิด
    const message = await readErrorMessage(response);
    if (message?.toLowerCase().includes("permission")) {
      dispatchAuthError(message);
      throw new ApiError(ERROR_CODES.FORBIDDEN, message, 403);
    }

    tokenStore.clear();
    throw new ApiError(ERROR_CODES.UNAUTHORIZED, "Session expired", 401);
  }

  if (response.status === 403) {
    // 403 มีสี่ความหมายที่ผู้ใช้แก้คนละวิธี — license (ไม่อยู่ในสัญญา), license หมดอายุ,
    // และ (Task 5.3) cluster เกินโควตาที่นั่งที่ซื้อไว้ (SEAT_LIMIT_EXCEEDED) ต้องเด้ง dialog
    // คนละความหมายจาก 403 ของสิทธิ์ (RBAC) เดิม ไม่งั้นลูกค้าที่สัญญาหมดอายุ/เกินโควตาจะเห็นว่า
    // "ไม่มีสิทธิ์" แล้วไปโทษแอดมินของตัวเองผิดที่ แยกด้วย `error.code` เท่านั้น (ดู
    // phase-c-backend-contract.md ข้อ 5) — `licenseErrorCodeFrom` คืน undefined ให้ทั้ง
    // permission 403 ปกติและ body รูปแปลกทุกแบบ (null, ไม่มี error, error เป็น string)
    // จึงไม่ throw และตกไปเส้นทางเดิม
    const body = await readErrorBody(response);
    const message =
      typeof (body as { message?: unknown } | undefined)?.message === "string"
        ? (body as { message: string }).message
        : undefined;
    const licenseCode = licenseErrorCodeFrom(body);

    if (licenseCode) {
      dispatchPermissionDenied(
        undefined,
        undefined,
        licenseCode === "LICENSE_EXPIRED"
          ? "expired"
          : licenseCode === "SEAT_LIMIT_EXCEEDED"
            ? "seat"
            : "license",
      );
    } else {
      dispatchAuthError(message);
    }

    throw new ApiError(ERROR_CODES.FORBIDDEN, message || "Access denied", 403);
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
