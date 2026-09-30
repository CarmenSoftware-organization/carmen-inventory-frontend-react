import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "use-intl";
import { logout } from "@/lib/auth/auth-api";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { SILENT_SSO_TRIED_KEY } from "@/lib/auth/silent-sso-guard";

/**
 * Logs the user out: `logout()` clears the access and refresh tokens and has the backend revoke the refresh
 * token, then the query cache is cleared and the browser goes to the gateway's front-channel
 * `/api/auth/end-session` (not `/login`) to end the Keycloak session too, or the next silent SSO check would
 * sign the user straight back in.
 * ออกจากระบบ: `logout()` เคลียร์ token และให้ backend revoke refresh token แล้วเคลียร์ query cache
 * และ navigate ไป `/api/auth/end-session` ของ gateway (ไม่ใช่ `/login`) เพื่อปิด session Keycloak ด้วย
 * ไม่งั้น silent SSO check รอบถัดไปจะ login ให้กลับมาเงียบๆ
 *
 * @returns useMutation object สำหรับทำ logout
 * @example
 * ```ts
 * const logout = useLogout();
 * <Button onClick={() => logout.mutate()}>ออกจากระบบ</Button>
 * ```
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const locale = useLocale();

  const redirectToEndSession = () => {
    queryClient.clear();
    // Pre-mark the silent-check guard: we just ended the only session, so the check on the /login this
    // redirect lands on would fire once more and fail (a wasted round trip and a visible flash).
    try {
      sessionStorage.setItem(SILENT_SSO_TRIED_KEY, "1");
    } catch {
      // ignore — worst case is just the one extra round trip this was meant to skip
    }
    window.location.href = `${getRuntimeConfig().BACKEND_URL}/api/auth/end-session?app=web&locale=${locale}`;
  };

  return useMutation({
    // logout() เคลียร์ session ฝั่ง local เสมอ (แม้ network ล้ม) แล้วยิง revoke
    mutationFn: () => logout(),
    onSettled: redirectToEndSession,
  });
}
