import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import { Link } from "react-router";
import { MailCheck } from "lucide-react";
import { ApiError, ERROR_CODES, isTransportError } from "@/lib/api-error";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { AuthFormAlert } from "@/components/auth/floating-field";
import { Button } from "@/components/ui/button";

/** วินาทีที่ต้องรอก่อนกดส่งลิงก์ซ้ำได้ — ตรงกับที่ backend จำกัดไว้ต่ออีเมล+IP ในเส้นทางสมัคร */
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * หน้าจอหลังขอลิงก์ทางอีเมลสำเร็จ — บอกให้ไปดูกล่องจดหมาย และให้ขอลิงก์ซ้ำได้เมื่อครบเวลารอ
 *
 * ใช้ร่วมกันระหว่างเส้นทางสมัคร (`/register`) และเส้นทางลืมรหัสผ่าน (`/forgot-password`)
 * ทั้งสองเส้นทางมีเรื่องเดียวกันให้จัดการ: คูลดาวน์ปุ่มส่งซ้ำ, การรับ `retry_after` จาก 429,
 * และการแปลข้อความผิดพลาด การก็อปโค้ดนี้ไปอีกชุดแปลว่าสองเส้นทางจะเพี้ยนจากกันเมื่อแก้ที่เดียว
 *
 * ข้อความเป็นแบบมีเงื่อนไข ("ถ้าอีเมลนี้...") ทุกเส้นทางโดยตั้งใจ — หน้าจอที่พูดว่า "ส่งไปแล้ว"
 * ลอย ๆ จะกลายเป็นการยืนยันว่าอีเมลนั้นมีบัญชีอยู่หรือไม่ ซึ่งเป็นสิ่งที่ทั้งสองเส้นทางพยายามไม่บอก
 *
 * @param props.email - อีเมลที่เพิ่งขอลิงก์ไป ใช้แสดงและใช้ขอซ้ำ
 * @param props.namespace - namespace ของข้อความ เช่น `auth.signup` หรือ `auth.forgotPassword`
 *   ต้องมีคีย์ครบชุด: checkInboxTitle · checkInboxDescription · linkExpiryNote · resend ·
 *   resendIn · tooManyAttempts · tooManyAttemptsIn · sendFailed
 * @param props.onResend - ยิงคำขอลิงก์ใหม่ ผู้เรียกเป็นคนเลือกว่าเรียก endpoint ไหน
 */
export default function CheckInbox({
  email,
  namespace,
  onResend,
}: {
  readonly email: string;
  readonly namespace: string;
  readonly onResend: (email: string) => Promise<void>;
}) {
  const t = useTranslations(namespace);
  // ข้อความที่อยู่นอก namespace ของเส้นทาง — ปัญหาระดับเครือข่ายกับป้ายปุ่ม "เข้าสู่ระบบ"
  // เป็นของกลาง ไม่ควรถูกก็อปเข้าไปในทุก namespace
  const ta = useTranslations("auth");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const resend = useMutation({
    mutationFn: () => onResend(email),
    onSuccess: () => setSecondsLeft(RESEND_COOLDOWN_SECONDS),
    // backend บอกมาว่าต้องรออีกกี่วินาที ให้ปุ่มรอตามนั้นจริง ๆ — คูลดาวน์หกสิบวินาทีของหน้านี้
    // สั้นกว่าหน้าต่างจำกัดสิทธิ์สิบนาที ปล่อยไว้ผู้ใช้จะกดแล้วเจอ 429 ซ้ำไปเรื่อย ๆ ทั้งที่
    // ระบบตอบมาแล้วว่าต้องรอถึงเมื่อไร
    onError: (error) => {
      const seconds =
        error instanceof ApiError && error.code === ERROR_CODES.RATE_LIMITED
          ? (error.details as { retryAfter?: number } | undefined)?.retryAfter
          : undefined;
      if (seconds !== undefined && seconds > 0) setSecondsLeft(seconds);
    },
  });

  // การขอซ้ำล้มเหลวต้องมีข้อความ — 429 เกิดได้จริงในเส้นทางสมัคร เพราะ backend จำกัดที่ 5 ครั้ง
  // ต่ออีเมล+IP ในหน้าต่างสิบนาที ขณะที่ปุ่มนี้ปลดล็อกทุกหกสิบวินาที ถ้าเงียบ ผู้ใช้จะกดแล้ว
  // ไม่เกิดอะไรขึ้นเลย
  const resendError =
    resend.error instanceof ApiError
      ? resend.error.code === ERROR_CODES.RATE_LIMITED
        ? secondsLeft > 0
          ? t("tooManyAttemptsIn", { seconds: secondsLeft })
          : t("tooManyAttempts")
        : isTransportError(resend.error)
          ? ta("errors.networkUnavailable")
          : resend.error.message
      : resend.error
        ? t("sendFailed")
        : null;

  return (
    <AuthSplitShell
      title={t("checkInboxTitle")}
      subtitle={t("checkInboxDescription", { email })}
    >
      <div
        className="mt-5 flex flex-col items-center gap-3 text-center"
        style={{ animation: "fade-up-soft 0.4s ease-out both" }}
      >
        <MailCheck className="text-positive-ink size-8" aria-hidden="true" />
        <p className="text-muted-foreground text-xs leading-relaxed">
          {t("linkExpiryNote")}
        </p>
        {resendError && <AuthFormAlert>{resendError}</AuthFormAlert>}

        <Button
          variant="outline"
          className="mt-1 h-10 w-full"
          disabled={secondsLeft > 0 || resend.isPending}
          onClick={() => resend.mutate()}
        >
          {secondsLeft > 0
            ? t("resendIn", { seconds: secondsLeft })
            : t("resend")}
        </Button>
      </div>

      <p className="text-muted-foreground mt-4 text-center text-xs">
        <Link
          to="/login"
          className="text-primary font-semibold underline-offset-4 hover:underline"
        >
          {ta("signIn")}
        </Link>
      </p>
    </AuthSplitShell>
  );
}
