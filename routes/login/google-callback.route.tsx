import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { profileQueryKey } from "@/hooks/use-profile";
import { tokenStore } from "@/lib/auth/token-store";
import { refreshTokenStorage } from "@/lib/auth/refresh-token-storage";
import { resolveNextPath } from "@/lib/auth/resolve-next-path";

/**
 * ปลายทางที่ gateway redirect กลับมาหลัง Google sign-in สำเร็จ (`GET /api/auth/google/callback`
 * บน backend) — token มากับ `window.location.hash` ไม่ใช่ query string เพราะ fragment ไม่ถูกส่งไป
 * server/CDN ใดๆ ต่างจาก query string ที่ติด access log ได้ อ่านครั้งเดียวแล้วเก็บด้วยกลไกเดียวกับ
 * login() ปกติใน lib/auth/auth-api.ts ก่อน navigate ต่อไป
 */
export function Component() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      navigate("/login?error=google_auth_failed", { replace: true });
      return;
    }

    tokenStore.set(accessToken);
    refreshTokenStorage.set(refreshToken);
    // เคลียร์ guard ของ silent SSO check (require-auth.tsx) — login สำเร็จแล้ว รอบหน้าที่ token
    // หายไปอีก (เช่น หลัง logout) ควรลอง silent check ใหม่ได้อีกครั้ง ไม่ใช่ข้ามไปตลอด tab session
    try {
      sessionStorage.removeItem("carmen.silentSsoTried");
    } catch {
      // ignore — storage unavailable, nothing to clear
    }
    queryClient.removeQueries({ queryKey: profileQueryKey });
    // ล้าง fragment ออกจาก URL ก่อนพาไปหน้าเป้าหมาย — token ไม่ควรค้างอยู่ใน history entry นี้
    // next มาจาก authorize's state round-trip (ดู auth.controller.ts's googleCallback) —
    // deep-link เดิม (เช่นลิงก์คำเชิญ) ที่ผู้ใช้เปิดไว้ก่อนเจอหน้า login
    navigate(resolveNextPath(params.get("next")), { replace: true });
  }, [navigate, queryClient]);

  return null;
}
