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

  return <ModuleError error={error} reset={() => void navigate(0)} />;
}
