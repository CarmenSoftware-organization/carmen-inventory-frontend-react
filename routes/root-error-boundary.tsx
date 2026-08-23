import { useEffect } from "react";
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

  // รายงานขึ้น SigNoz — import แบบ dynamic เพื่อไม่ให้ boundary ลาก SDK เข้ามาใน
  // bundle หลัก ถ้า telemetry ปิดอยู่ chunk นี้ไม่เคยถูกโหลดตั้งแต่ต้น
  // ถึงตรงนี้แล้ว SDK ถูก init ไปแล้วเสมอ (boot สำเร็จ) จึงเรียก reportError ได้ตรง ๆ
  useEffect(() => {
    void import("@/lib/telemetry")
      .then((m) =>
        m.reportError(error.message, {
          stack: error.stack,
          source: "RootErrorBoundary",
        }),
      )
      .catch(() => {
        /* เงียบ — error boundary ห้ามพังซ้ำ */
      });
  }, [error]);

  return (
    <I18nProvider>
      <div className="bg-background flex min-h-dvh flex-col">
        <ModuleError error={error} reset={() => void navigate(0)} />
      </div>
    </I18nProvider>
  );
}
