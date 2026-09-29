import { useEffect, useSyncExternalStore } from "react";
import { Navigate, useLocation } from "react-router";
import { tokenStore } from "@/lib/auth/token-store";
import { getRuntimeConfig } from "@/lib/runtime-config";

/**
 * Set once per tab session right before the silent-check redirect below fires, and cleared on
 * a successful sign-in (google-callback.route.tsx). Not a loop guard in the strict sense — a
 * silent check that finds no session lands the browser on the public /login route directly
 * (outside this guard), so it can never re-trigger for the same path — this exists to skip the
 * redirect round-trip (and its latency) for every OTHER protected route the user might hit
 * while still logged out in this same tab, once a silent check has already come back empty.
 * ตั้งครั้งเดียวต่อ tab session ก่อน redirect เช็คแบบเงียบด้านล่างจะยิง แล้วเคลียร์ตอน sign-in สำเร็จ
 * (google-callback.route.tsx) ไม่ใช่ loop guard แบบเข้มงวด — silent check ที่ไม่เจอ session จะพา
 * browser ไปหน้า /login ตรงๆ (อยู่นอก guard นี้) จึงไม่มีทางย้อนกลับมาเจอ path เดิมซ้ำได้เลย — มีไว้
 * เพื่อข้ามรอบ redirect (และ latency ของมัน) สำหรับ protected route อื่นๆที่ user อาจเปิดขณะยัง
 * logout อยู่ใน tab เดียวกันนี้ หลังจากเช็คแบบเงียบไปแล้วครั้งหนึ่งแล้วไม่เจออะไร
 */
const SILENT_SSO_TRIED_KEY = "carmen.silentSsoTried";

/** Pure read — safe during render, unlike the `setItem` that follows a decision to redirect. */
function hasTriedSilentSso(): boolean {
  try {
    return sessionStorage.getItem(SILENT_SSO_TRIED_KEY) === "1";
  } catch {
    return false;
  }
}

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

  useEffect(() => {
    if (!shouldTrySilentCheck) return;
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
