import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import { Link } from "react-router";
import { MailCheck } from "lucide-react";
import { signupRequest } from "@/lib/auth/auth-api";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
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
  });

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
