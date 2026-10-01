import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "@/lib/auth/auth-api";

/**
 * Hook สำหรับ logout ผู้ใช้ เคลียร์ session/cache และ redirect กลับหน้า login
 *
 * เรียก `logout()` ของ auth-api ซึ่งเคลียร์ทั้ง access token (in-memory) และ
 * refresh token (localStorage) พร้อมส่ง refresh_token ให้ backend revoke ฝั่ง
 * server ก่อน แล้วจึงเคลียร์ query cache ทั้งหมดและบังคับ navigate ด้วย
 * `window.location.href` หากไม่เคลียร์ refresh token, boot ครั้งถัดไป
 * (`refreshTokens()` ใน main.tsx) จะกู้ session กลับมาเงียบ ๆ
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

  const redirectToLogin = () => {
    queryClient.clear();
    window.location.href = "/login";
  };

  return useMutation({
    // logout() เคลียร์ session ฝั่ง local เสมอ (แม้ network ล้ม) แล้วยิง revoke
    mutationFn: () => logout(),
    onSettled: redirectToLogin,
  });
}
