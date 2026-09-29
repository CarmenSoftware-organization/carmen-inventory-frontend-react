import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "use-intl";
import { logout } from "@/lib/auth/auth-api";
import { getRuntimeConfig } from "@/lib/runtime-config";

/**
 * Hook สำหรับ logout ผู้ใช้ เคลียร์ session/cache และ redirect กลับหน้า login
 *
 * เรียก `logout()` ของ auth-api ซึ่งเคลียร์ทั้ง access token (in-memory) และ
 * refresh token (localStorage) พร้อมส่ง refresh_token ให้ backend revoke ฝั่ง
 * server ก่อน แล้วจึงเคลียร์ query cache ทั้งหมดและบังคับ navigate ไปที่ gateway's
 * front-channel `/api/auth/end-session` (ไม่ใช่ `/login` ตรงๆ) เพื่อปิด
 * KEYCLOAK_SESSION cookie ของ browser ด้วย — ถ้าปิดแค่ session ฝั่ง local
 * silent-SSO check (`require-auth.tsx`) รอบถัดไปจะเจอ session Keycloak ที่ยัง
 * live อยู่แล้วล็อกอินให้เงียบๆ กลับมาเหมือนไม่ได้ logout เลย
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
    window.location.href = `${getRuntimeConfig().BACKEND_URL}/api/auth/end-session?app=web&locale=${locale}`;
  };

  return useMutation({
    // logout() เคลียร์ session ฝั่ง local เสมอ (แม้ network ล้ม) แล้วยิง revoke
    mutationFn: () => logout(),
    onSettled: redirectToEndSession,
  });
}
