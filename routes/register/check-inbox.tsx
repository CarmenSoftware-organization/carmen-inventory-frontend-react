import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import { Link } from "react-router";
import { MailCheck } from "lucide-react";
import { ApiError, ERROR_CODES, isTransportError } from "@/lib/api-error";
import { signupRequest } from "@/lib/auth/auth-api";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { AuthFormAlert } from "@/components/auth/floating-field";
import { Button } from "@/components/ui/button";

/** วินาทีที่ต้องรอก่อนกดส่งลิงก์ซ้ำได้ — ตรงกับที่ backend จำกัดไว้ต่ออีเมล+IP */
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * หน้าจอหลังขอลิงก์สำเร็จ — บอกให้ไปดูกล่องจดหมาย และให้ขอลิงก์ซ้ำได้เมื่อครบเวลารอ
 *
 * ข้อความเป็นแบบมีเงื่อนไข ("ถ้าอีเมลนี้สมัครได้") ตรงกับที่ backend ตอบ 200 เสมอไม่ว่าอีเมลนั้น
 * จะมีบัญชีอยู่แล้วหรือไม่ — หน้าจอที่พูดว่า "ส่งไปแล้ว" ลอย ๆ จะกลายเป็นการยืนยันว่าอีเมลนั้นว่าง
 *
 * @param props.email - อีเมลที่เพิ่งขอลิงก์ไป ใช้แสดงและใช้ขอซ้ำ
 */
export default function CheckInbox({ email }: { readonly email: string }) {
  const t = useTranslations("auth");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const resend = useMutation({
    mutationFn: () => signupRequest(email),
    onSuccess: () => setSecondsLeft(RESEND_COOLDOWN_SECONDS),
    // backend บอกมาว่าต้องรออีกกี่วินาที ให้ปุ่มรอตามนั้นจริง ๆ — คูลดาวน์หกสิบวินาทีของหน้านี้
    // สั้นกว่าหน้าต่างจำกัดสิทธิ์สิบนาทีมาก ปล่อยไว้ผู้ใช้จะกดแล้วเจอ 429 ซ้ำไปเรื่อย ๆ ทั้งที่
    // ระบบตอบมาแล้วว่าต้องรอถึงเมื่อไร
    onError: (error) => {
      const seconds =
        error instanceof ApiError && error.code === ERROR_CODES.RATE_LIMITED
          ? (error.details as { retryAfter?: number } | undefined)?.retryAfter
          : undefined;
      if (seconds !== undefined && seconds > 0) setSecondsLeft(seconds);
    },
  });

  // การขอซ้ำล้มเหลวต้องมีข้อความ — 429 เกิดได้จริงเพราะ backend จำกัดที่ 5 ครั้งต่ออีเมล+IP
  // ในหน้าต่างสิบนาที ขณะที่ปุ่มนี้ปลดล็อกทุกหกสิบวินาที ถ้าเงียบ ผู้ใช้จะกดแล้วไม่เกิดอะไรขึ้นเลย
  const resendError =
    resend.error instanceof ApiError
      ? resend.error.code === ERROR_CODES.RATE_LIMITED
        ? secondsLeft > 0
          ? t("signup.tooManyAttemptsIn", { seconds: secondsLeft })
          : t("signup.tooManyAttempts")
        : isTransportError(resend.error)
          ? t("errors.networkUnavailable")
          : resend.error.message
      : resend.error
        ? t("signup.sendFailed")
        : null;

  return (
    <AuthSplitShell
      title={t("signup.checkInboxTitle")}
      subtitle={t("signup.checkInboxDescription", { email })}
    >
      <div
        className="mt-5 flex flex-col items-center gap-3 text-center"
        style={{ animation: "fade-up-soft 0.4s ease-out both" }}
      >
        <MailCheck className="text-positive-ink size-8" aria-hidden="true" />
        <p className="text-muted-foreground text-xs leading-relaxed">
          {t("signup.linkExpiryNote")}
        </p>
        {resendError && <AuthFormAlert>{resendError}</AuthFormAlert>}

        <Button
          variant="outline"
          className="mt-1 h-10 w-full"
          disabled={secondsLeft > 0 || resend.isPending}
          onClick={() => resend.mutate()}
        >
          {secondsLeft > 0
            ? t("signup.resendIn", { seconds: secondsLeft })
            : t("signup.resend")}
        </Button>
      </div>

      <p className="text-muted-foreground mt-4 text-center text-xs">
        <Link
          to="/login"
          className="text-primary font-semibold underline-offset-4 hover:underline"
        >
          {t("signIn")}
        </Link>
      </p>
    </AuthSplitShell>
  );
}
