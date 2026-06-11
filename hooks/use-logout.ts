import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { httpClient } from "@/lib/http-client";

/**
 * Hook สำหรับ logout ผู้ใช้ เคลียร์ cache และ redirect กลับหน้า login
 *
 * เคลียร์ query cache ทั้งหมดและบังคับ navigate ด้วย `window.location.href`
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
    mutationFn: async () => {
      const res = await httpClient.post(API_ENDPOINTS.LOGOUT);
      if (!res.ok) throw new Error("Logout failed");
    },
    onSuccess: redirectToLogin,
    onError: redirectToLogin,
  });
}
