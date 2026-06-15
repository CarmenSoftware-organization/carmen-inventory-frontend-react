import { useSyncExternalStore } from "react";
import { Navigate, useSearchParams } from "react-router";
import { tokenStore } from "@/lib/auth/token-store";
import { resolveNextPath } from "@/lib/auth/resolve-next-path";

/**
 * Route guard ตรงข้ามกับ RequireAuth — ถ้ามี access token อยู่แล้ว (login แล้ว)
 * แล้วเข้า /login ให้เด้งไปปลายทางทันที (`?next=` ที่ผ่านการ sanitize หรือ
 * /dashboard) แทนที่จะแสดงฟอร์ม login ซ้ำ
 */
export function RedirectIfAuthed({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const token = useSyncExternalStore(tokenStore.subscribe, tokenStore.get);
  const [searchParams] = useSearchParams();

  if (token) {
    return <Navigate to={resolveNextPath(searchParams.get("next"))} replace />;
  }
  return <>{children}</>;
}
