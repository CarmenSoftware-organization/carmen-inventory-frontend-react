import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { profileQueryKey } from "@/hooks/use-profile";
import { tokenStore } from "@/lib/auth/token-store";
import { refreshTokenStorage } from "@/lib/auth/refresh-token-storage";
import { resolveNextPath } from "@/lib/auth/resolve-next-path";
import { SILENT_SSO_TRIED_KEY } from "@/lib/auth/silent-sso-guard";

/**
 * Where the gateway redirects after a successful Keycloak sign-in. The tokens arrive in the URL fragment
 * (never sent to a server or CDN, unlike a query string) and are stored the same way as `login()` in
 * lib/auth/auth-api.ts before navigating on.
 * ปลายทางที่ gateway redirect กลับมาหลัง sign-in ผ่าน Keycloak สำเร็จ token มาใน URL fragment (ไม่ถูกส่งไป
 * server/CDN ต่างจาก query string) เก็บด้วยกลไกเดียวกับ `login()` ใน lib/auth/auth-api.ts ก่อน navigate ต่อ
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
      navigate("/login?error=auth_failed", { replace: true });
      return;
    }

    tokenStore.set(accessToken);
    refreshTokenStorage.set(refreshToken);
    // Clear the silent-check guard so a later token loss (e.g. after logout) can retry the check.
    try {
      sessionStorage.removeItem(SILENT_SSO_TRIED_KEY);
    } catch {
      // ignore — storage unavailable, nothing to clear
    }
    queryClient.removeQueries({ queryKey: profileQueryKey });
    // `replace` drops the fragment from history so the tokens don't linger there. `next` is the deep link
    // (e.g. an invitation) round-tripped through the authorize `state` (see auth.controller.ts).
    navigate(resolveNextPath(params.get("next")), { replace: true });
  }, [navigate, queryClient]);

  return null;
}
