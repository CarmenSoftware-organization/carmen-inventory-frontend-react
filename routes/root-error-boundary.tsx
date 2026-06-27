import { useNavigate, useRouteError } from "react-router";
import { I18nProvider } from "@/components/i18n-provider";
import ModuleError from "@/components/ui/module-error-boundary";

/**
 * Catch-all error boundary บน route ราก — รับ error ที่หลุดจากทุก route ที่ไม่มี
 * boundary ของตัวเอง (login, /pl, not-found, หรือกรณี AppRoot/RootLayout พังเอง)
 * กัน default error screen ของ react-router ไม่ให้โผล่ที่ไหนเลย
 *
 * ⚠️ boundary นี้ render แทน <AppRoot> ทั้งก้อน → I18nProvider/Providers ที่อยู่
 * ใน AppRoot ไม่ถูก mount จึงต้องห่อ I18nProvider เองเพื่อให้ ErrorState แปลภาษาได้
 * (provider เดิมไม่อยู่ใน scope แล้ว). reset = navigate(0) → full reload เคลียร์
 * error state + re-fetch chunk ที่โหลดพลาด (เหมือน RouteErrorBoundaryAdapter)
 */
export function RootErrorBoundary() {
  const rawError = useRouteError();
  const navigate = useNavigate();

  const error =
    rawError instanceof Error ? rawError : new Error(String(rawError));

  return (
    <I18nProvider>
      <div className="bg-background flex min-h-dvh flex-col">
        <ModuleError error={error} reset={() => void navigate(0)} />
      </div>
    </I18nProvider>
  );
}
