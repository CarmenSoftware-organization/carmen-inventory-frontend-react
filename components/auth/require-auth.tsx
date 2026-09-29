import { useEffect, useRef, useSyncExternalStore } from "react";
import { Navigate, useLocation } from "react-router";
import { tokenStore } from "@/lib/auth/token-store";
import { getRuntimeConfig } from "@/lib/runtime-config";
import {
  SILENT_SSO_TRIED_KEY,
  hasTriedSilentSso,
} from "@/lib/auth/silent-sso-guard";

/**
 * Route guard ระดับ auth — token ใน store หาย (เช่น refresh ล้มเหลวกลางคัน
 * จาก http-client) → redirect ไป /login ทันทีผ่าน useSyncExternalStore
 * (การเช็ค permission รายหน้าเป็นหน้าที่ของ RouteGuard เดิม)
 *
 * ก่อน redirect ไป /login ตรงๆ ลอง silent SSO check ก่อนหนึ่งครั้งต่อ tab session — ถ้า Keycloak
 * มี session ที่ยัง live อยู่แล้ว (เช่น login ผ่านอีกแอปมา) จะได้ token กลับมาโดยไม่ต้องกดอะไรเลย
 * แล้วกลับมาที่ path เดิม (`next`); ถ้าไม่มี session Keycloak ตอบเงียบๆ (`login_required`) แล้ว
 * gateway ก็ส่งกลับมาที่ /login ตามปกติ ไม่มี error banner
 */
export function RequireAuth({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const token = useSyncExternalStore(tokenStore.subscribe, tokenStore.get);
  const location = useLocation();
  // Pure read during render (React Compiler forbids mutating anything outside the component
  // during render, which is why the sessionStorage.setItem + window.location.href assignment
  // below live in the effect instead) — worst case if storage is unavailable is one extra
  // redirect round-trip, never a loop (see the constant's comment).
  const shouldTrySilentCheck = !token && !hasTriedSilentSso();
  // Guards the effect below against React.StrictMode's dev-only double-invoke (mount → unmount
  // → remount without a new render in between) — `shouldTrySilentCheck` is a frozen value
  // captured by both invocations' closures, so without this ref both would fire the same real
  // top-level navigation twice back-to-back. A ref (not sessionStorage) because it must reset
  // to `false` per real mount, whereas sessionStorage deliberately persists across mounts
  // within a tab — same pattern as carmen-platform's `silentCheckStartedRef` (AuthContext.tsx).
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
