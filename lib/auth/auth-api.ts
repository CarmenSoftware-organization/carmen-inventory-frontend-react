import { ApiError, ERROR_CODES } from "@/lib/api-error";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { refreshTokenStorage } from "./refresh-token-storage";
import { tokenStore } from "./token-store";

/**
 * Auth API ฝั่ง client — แทน Next server routes /api/auth/* เดิมทั้งหมด
 * (backend คืน token ใน JSON body และรับ refresh_token ทาง request body)
 */

interface LoginResult {
  platform_role?: string;
}

const authHeaders = (): Record<string, string> => ({
  "Content-Type": "application/json",
  "x-app-id": getRuntimeConfig().X_APP_ID,
});

export async function login(email: string, password: string): Promise<LoginResult> {
  const { BACKEND_URL } = getRuntimeConfig();
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ApiError(ERROR_CODES.NETWORK_ERROR, "Auth server unavailable", undefined, true);
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const retryAfter: number | undefined =
      typeof json?.retry_after === "number"
        ? json.retry_after
        : (() => {
            const h = res.headers.get("Retry-After");
            const n = h !== null ? Number(h) : NaN;
            return isNaN(n) ? undefined : n;
          })();
    throw new ApiError(
      res.status === 401
        ? ERROR_CODES.UNAUTHORIZED
        : res.status === 429
          ? ERROR_CODES.RATE_LIMITED
          : ERROR_CODES.INTERNAL_ERROR,
      json?.message ?? "Login failed",
      res.status,
      false,
      retryAfter !== undefined ? { retryAfter } : undefined,
    );
  }

  const { access_token, refresh_token, platform_role } = json?.data ?? {};
  if (!access_token || !refresh_token) {
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "Invalid login response from backend", 502);
  }

  tokenStore.set(access_token);
  refreshTokenStorage.set(refresh_token);
  return { platform_role };
}

// Mutex — concurrent 401s แชร์ refresh request เดียวกัน (พฤติกรรมเดิมจาก http-client)
let refreshPromise: Promise<boolean> | null = null;

export function refreshTokens(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = doRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function doRefresh(): Promise<boolean> {
  const refresh_token = refreshTokenStorage.get();
  if (!refresh_token) return false;

  const { BACKEND_URL } = getRuntimeConfig();
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/auth/refresh-token`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ refresh_token }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return false; // network/timeout — อย่าเคลียร์ session (อาจ offline ชั่วคราว)
  }

  if (!res.ok) {
    clearSession();
    return false;
  }

  const json = await res.json().catch(() => null);
  const tokens = json?.data;
  if (!tokens?.access_token) {
    clearSession();
    return false;
  }

  tokenStore.set(tokens.access_token);
  if (tokens.refresh_token) refreshTokenStorage.set(tokens.refresh_token);
  return true;
}

export async function logout(): Promise<void> {
  const { BACKEND_URL } = getRuntimeConfig();
  const accessToken = tokenStore.get();
  const refresh_token = refreshTokenStorage.get() ?? "";
  clearSession();

  if (!accessToken) return;
  try {
    await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: "POST",
      headers: { ...authHeaders(), Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ refresh_token }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // fire-and-forget — local session เคลียร์ไปแล้ว
  }
}

function clearSession(): void {
  tokenStore.clear();
  refreshTokenStorage.clear();
}
