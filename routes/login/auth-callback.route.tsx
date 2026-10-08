import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { tokenStore } from "@/lib/auth/token-store";
import { refreshTokenStorage } from "@/lib/auth/refresh-token-storage";
import { resolveNextPath } from "@/lib/auth/resolve-next-path";

/**
 * Where the gateway redirects after a Google sign-in. The tokens arrive in the URL fragment (never sent to a
 * server or CDN, unlike a query string) and are stored the same way as `login()` in lib/auth/auth-api.ts
 * before navigating on.
 * ปลายทางที่ gateway redirect กลับมาหลัง sign-in ด้วย Google token มาใน URL fragment (ไม่ถูกส่งไป
 * server/CDN ต่างจาก query string) เก็บด้วยกลไกเดียวกับ `login()` ใน lib/auth/auth-api.ts ก่อน navigate ต่อ
 */
export function Component() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const handled = useRef(false);

  useEffect(() => {
    // StrictMode runs effects twice in dev. The fragment is removed below, so a second run would find no
    // tokens and bounce to /login?error — read once only.
    if (handled.current) return;
    handled.current = true;

    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const next = params.get("next");

    // Take the tokens out of the address bar right away (keeping the router's history state): the fragment
    // would otherwise sit in the URL — and in anything that reads `location.href` — until the lazy
    // dashboard chunk has loaded.
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname + window.location.search,
    );

    if (!accessToken || !refreshToken) {
      const query = new URLSearchParams({ error: "google_failed" });
      if (next) query.set("next", next);
      navigate(`/login?${query.toString()}`, { replace: true });
      return;
    }

    tokenStore.set(accessToken);
    refreshTokenStorage.set(refreshToken);
    // A different user may have been signed in before: drop everything cached for them, not just the profile.
    queryClient.clear();
    // `next` is the deep link (e.g. an invitation) round-tripped through the authorize `state`
    // (see auth.controller.ts).
    navigate(resolveNextPath(next), { replace: true });
  }, [navigate, queryClient]);

  return null;
}
