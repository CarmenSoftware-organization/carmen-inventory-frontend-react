import { useSyncExternalStore } from "react";
import { Navigate, useLocation } from "react-router";
import { tokenStore } from "@/lib/auth/token-store";

/**
 * Route guard ระดับ auth — token ใน store หาย (เช่น refresh ล้มเหลวกลางคัน
 * จาก http-client) → redirect ไป /login ทันทีผ่าน useSyncExternalStore
 * (การเช็ค permission รายหน้าเป็นหน้าที่ของ RouteGuard เดิม)
 */
export function RequireAuth({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const token = useSyncExternalStore(tokenStore.subscribe, tokenStore.get);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
