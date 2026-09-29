import { useEffect } from "react";
import { useTranslations, useLocale } from "use-intl";
import { Link, useLocation, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { profileQueryKey } from "@/hooks/use-profile";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { AuthFormAlert } from "@/components/auth/floating-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";

export default function LoginForm() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const locale = useLocale();
  // ตั้งโดย /register/verify หลังสร้างบัญชีสำเร็จ — เป็น router state ไม่ใช่ query string
  // จึงหายไปเองเมื่อรีเฟรช ซึ่งถูกแล้ว เพราะข้อความนี้ควรเห็นครั้งเดียว
  const justRegistered =
    (location.state as { justRegistered?: boolean } | null)?.justRegistered ===
    true;
  // ตั้งโดย /reset-password หลังตั้งรหัสผ่านใหม่สำเร็จ — backend ไม่คืน token ให้ล็อกอินอัตโนมัติ
  // ผู้ใช้จึงมาถึงที่นี่พร้อมรหัสใหม่ในมือ และต้องรู้ว่าการตั้งรหัสสำเร็จแล้วจริง
  const passwordReset =
    (location.state as { passwordReset?: boolean } | null)?.passwordReset ===
    true;
  // ตั้งโดย gateway (GET /api/auth/google/callback) ตอน redirect กลับมาหลัง sign-in ล้มเหลว — ชื่อ
  // endpoint/sentinel ("google_auth_failed") เป็นของเดิมตั้งแต่ก่อนมีปุ่ม [Sign in] เดียว (ตอนนั้นมี
  // ปุ่ม Google แยก) ตอนนี้ callback นี้ใช้ร่วมกันทั้ง password และ Google (เลือกที่หน้า Keycloak เอง)
  // ข้อความที่โชว์จึงใช้คำกลางๆ ไม่เจาะจง Google
  const signInFailed = searchParams.get("error") === "google_auth_failed";
  // เก็บ next ที่ตั้งใจจะไปหลัง login ต่อผ่าน backend (จะได้กลับมาเป็น #next=... ใน
  // google-callback.route.tsx) — ไม่งั้น deep-link (เช่นลิงก์คำเชิญ) หายไปเพราะ full-page redirect
  // ตัดขาดจาก React Router state ทั้งหมด
  const next = searchParams.get("next");
  const t = useTranslations("auth");

  useEffect(() => {
    queryClient.removeQueries({ queryKey: profileQueryKey });
  }, [queryClient]);

  // แถบยืนยันเหนือฟอร์ม — มาจากเส้นทางที่พาผู้ใช้มาที่นี่ ไม่ใช่จากสถานะของฟอร์มเอง
  // ทั้งสองกรณีเกิดพร้อมกันไม่ได้ (คนละ navigate) จึงเลือกอันเดียวพอ
  const notice = justRegistered
    ? t("signup.accountReady")
    : passwordReset
      ? t("resetPassword.successBanner")
      : null;

  return (
    <AuthSplitShell title={t("welcomeBack")} subtitle={t("subtitle")}>
      <FieldGroup className="mt-4 gap-3">
        {notice && (
          <div
            className="border-positive-ink/40 bg-positive-ink/5 rounded-xl border px-3 py-2"
            style={{ animation: "fade-up-soft 0.3s ease-out both" }}
            role="status"
            aria-live="polite"
          >
            <p className="text-positive-ink text-xs font-semibold">{notice}</p>
          </div>
        )}

        {signInFailed && (
          <AuthFormAlert>{t("errors.signInFailed")}</AuthFormAlert>
        )}

        {/* Real page navigation, not fetch — Keycloak's own hosted login page (password form
            plus any configured Identity Provider buttons) lives on a different origin, which
            a JSON call can never reach. */}
        <Button
          type="button"
          className="group mt-0.5 h-10 w-full"
          onClick={() => {
            const params = new URLSearchParams({ app: "web", locale });
            if (next) params.set("next", next);
            window.location.href = `${getRuntimeConfig().BACKEND_URL}/api/auth/authorize?${params.toString()}`;
          }}
        >
          {t("signIn")}
        </Button>

        {/* อยู่ติดปุ่ม Sign in โดยตั้งใจ — คนที่กดหาลิงก์นี้คือคนที่จำรหัสผ่านไม่ได้ */}
        <div className="-mt-1.5 flex justify-end">
          <Link
            to="/forgot-password"
            className="text-muted-foreground hover:text-primary py-1 text-xs underline-offset-4 transition-colors hover:underline"
          >
            {t("forgotPasswordLink")}
          </Link>
        </div>

      </FieldGroup>

      <p className="text-muted-foreground mt-4 text-center text-xs">
        {t("noAccount")}{" "}
        <Link
          to="/register"
          className="text-primary font-semibold underline-offset-4 hover:underline"
        >
          {t("createAccount")}
        </Link>
      </p>

      <p className="text-muted-foreground/60 text-micro-legal mt-3 text-center leading-relaxed">
        {t.rich("termsLine", {
          terms: (chunks) => (
            <Link
              to="/terms"
              className="text-foreground/70 underline-offset-4 hover:underline"
            >
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link
              to="/privacy"
              className="text-foreground/70 underline-offset-4 hover:underline"
            >
              {chunks}
            </Link>
          ),
        })}
      </p>
    </AuthSplitShell>
  );
}
