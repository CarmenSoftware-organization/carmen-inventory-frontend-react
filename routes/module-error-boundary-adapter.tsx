import { useNavigate, useRouteError } from "react-router";
import ModuleError from "@/components/ui/module-error-boundary";

/**
 * แปลงสัญญา error boundary ของ react-router (useRouteError) ให้เข้ากับ
 * ModuleErrorBoundary เดิมจาก Next ({ error, reset }) — ใช้ซ้ำได้ทุกโมดูล/เฟส
 * reset = navigate(0) เพื่อ remount subtree ของ route ปัจจุบัน
 */
export function RouteErrorBoundaryAdapter() {
  const rawError = useRouteError();
  const navigate = useNavigate();

  const error =
    rawError instanceof Error ? rawError : new Error(String(rawError));

  // navigate(0) = history.go(0) → full reload โดยเจตนา: เคลียร์ error state +
  // re-fetch chunk ที่โหลดพลาด (อย่าเปลี่ยนเป็น revalidate() — มันไม่เคลียร์ error boundary)
  return <ModuleError error={error} reset={() => void navigate(0)} />;
}
