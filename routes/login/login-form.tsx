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
  // ตั้งโดย gateway (GET /api/auth/google/callback) ตอน redirect กลับมาหลัง sign-in ล้มเหลว — ค่านี้
  // ("google_auth_failed") ใช้ร่วมกันทั้ง flow ปุ่ม Google และปุ่ม Sign in ธรรมดา (callback เดียวกัน)
  // ชื่อ sentinel ยังอิงตามที่ backend ส่งมา แต่ข้อความที่โชว์ใช้คำกลางๆ ไม่เจาะจง Google
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

        <div className="my-1 flex items-center gap-3" aria-hidden>
          <div className="bg-border h-px flex-1" />
          <span className="text-muted-foreground text-xs">
            {t("orDivider")}
          </span>
          <div className="bg-border h-px flex-1" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-10 w-full gap-2"
          onClick={() => {
            const params = new URLSearchParams({ app: "web", locale });
            if (next) params.set("next", next);
            window.location.href = `${getRuntimeConfig().BACKEND_URL}/api/auth/google/authorize?${params.toString()}`;
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.8 2.73v2.27h2.92c1.7-1.57 2.68-3.88 2.68-6.64z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.27c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.34C2.44 15.98 5.48 18 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.97 10.7c-.18-.54-.28-1.11-.28-1.7s.1-1.16.28-1.7V4.96H.96A8.996 8.996 0 000 9c0 1.45.35 2.83.96 4.04l3.01-2.34z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"
            />
          </svg>
          {t("signInWithGoogle")}
        </Button>
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
