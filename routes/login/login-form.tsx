import { useEffect, useRef } from "react";
import { useTranslations, useLocale } from "use-intl";
import { Link, useLocation, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { profileQueryKey } from "@/hooks/use-profile";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { tokenStore } from "@/lib/auth/token-store";
import {
  SILENT_SSO_TRIED_KEY,
  hasTriedSilentSso,
} from "@/lib/auth/silent-sso-guard";
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
  // Set by the gateway callback (`?error=auth_failed`) when sign-in fails; the message is generic
  // because the callback serves every sign-in method.
  // ตั้งโดย callback ของ gateway (`?error=auth_failed`) เมื่อ sign-in ล้มเหลว ข้อความเป็นคำกลางๆ
  // เพราะ callback รองรับทุกวิธี sign-in
  const signInFailed = searchParams.get("error") === "auth_failed";
  // Passed through the backend (back as `#next=...` in auth-callback.route.tsx) because a full-page
  // redirect drops all React Router state, which would lose a deep link such as an invitation.
  // ส่งต่อผ่าน backend (กลับมาเป็น `#next=...`) เพราะ full-page redirect ทิ้ง React Router state ทำให้ deep link (เช่นลิงก์คำเชิญ) หาย
  const next = searchParams.get("next");
  const t = useTranslations("auth");
  // StrictMode's dev double-invoke would fire the redirect twice on a reload (where hasTriedSilentSso() ignores
  // its storage guard on every run). A ref, not sessionStorage: it must reset on every real mount.
  const silentCheckStartedRef = useRef(false);

  useEffect(() => {
    queryClient.removeQueries({ queryKey: profileQueryKey });
  }, [queryClient]);

  // One silent SSO check per tab session on /login itself too (not only on protected routes): opening /login
  // directly (e.g. a bookmark) with a live Keycloak session should sign in without another click. Shares
  // `hasTriedSilentSso()` with require-auth.tsx so the "reload always retries" rule applies here too.
  // ลอง silent SSO check หนึ่งครั้งต่อ tab session ที่ /login เองด้วย (ไม่ใช่แค่ protected route): เปิด /login ตรงๆ
  // (เช่นจาก bookmark) ขณะมี session Keycloak ที่ live อยู่ก็เข้าได้เลย ใช้ `hasTriedSilentSso()` ร่วมกับ require-auth.tsx
  useEffect(() => {
    if (silentCheckStartedRef.current) return; // see the ref's own comment above
    if (tokenStore.get()) return;
    if (hasTriedSilentSso()) return;
    silentCheckStartedRef.current = true;
    try {
      sessionStorage.setItem(SILENT_SSO_TRIED_KEY, "1");
    } catch {
      // ignore
    }
    const params = new URLSearchParams({ app: "web", locale, silent: "true" });
    if (next) params.set("next", next);
    window.location.href = `${getRuntimeConfig().BACKEND_URL}/api/auth/authorize?${params.toString()}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        {/* A real page navigation, not fetch: Keycloak's hosted login page is on another origin. */}
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
