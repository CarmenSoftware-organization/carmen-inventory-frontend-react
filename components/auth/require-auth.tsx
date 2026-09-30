import { useEffect, useRef, useSyncExternalStore } from "react";
import { Navigate, useLocation } from "react-router";
import { tokenStore } from "@/lib/auth/token-store";
import { getRuntimeConfig } from "@/lib/runtime-config";
import {
  SILENT_SSO_TRIED_KEY,
  hasTriedSilentSso,
} from "@/lib/auth/silent-sso-guard";

/**
 * Auth route guard: redirects to /login as soon as the token store empties (e.g. a refresh failing mid-session).
 * Per-page permission checks stay with RouteGuard. Before redirecting it tries one silent SSO check per tab
 * session: a live Keycloak session (e.g. from the other app) signs the user in with no click and returns to
 * `next`; otherwise Keycloak answers `login_required` and the gateway sends the user to /login, no error banner.
 * Route guard ระดับ auth: token ใน store หาย (เช่น refresh ล้มเหลวกลางคัน) → redirect ไป /login ทันที
 * (เช็ค permission รายหน้าเป็นของ RouteGuard) ก่อน redirect ลอง silent SSO check หนึ่งครั้งต่อ tab session:
 * มี session Keycloak ที่ live อยู่ (เช่นจากอีกแอป) ก็ login ให้เงียบๆ แล้วกลับ `next` ไม่มีก็ gateway ส่งไป /login
 */
export function RequireAuth({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const token = useSyncExternalStore(tokenStore.subscribe, tokenStore.get);
  const location = useLocation();
  // Pure read during render (React Compiler forbids side effects here, so the storage write and redirect live
  // in the effect). Without storage the worst case is one extra redirect, never a loop.
  const shouldTrySilentCheck = !token && !hasTriedSilentSso();
  // StrictMode's dev double-invoke would fire the same navigation twice. A ref, not sessionStorage: it must
  // reset on every real mount (same as Platform's `silentCheckStartedRef`).
  const silentCheckStartedRef = useRef(false);

  useEffect(() => {
    if (!shouldTrySilentCheck) return;
    if (silentCheckStartedRef.current) return; // see the ref's own comment above
    silentCheckStartedRef.current = true;
    try {
      sessionStorage.setItem(SILENT_SSO_TRIED_KEY, "1");
    } catch {
      // ignore — see above
    }
    const next = `${location.pathname}${location.search}`;
    window.location.href = `${getRuntimeConfig().BACKEND_URL}/api/auth/authorize?app=web&silent=true&next=${encodeURIComponent(next)}`;
  }, [shouldTrySilentCheck, location.pathname, location.search]);

  if (!token) {
    if (shouldTrySilentCheck) return null; // navigating away in the effect above; nothing to show yet
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
