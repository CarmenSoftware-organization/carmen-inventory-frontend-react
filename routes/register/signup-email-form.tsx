import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { ApiError, ERROR_CODES, isTransportError } from "@/lib/api-error";
import { signupRequest } from "@/lib/auth/auth-api";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { AuthFormAlert, FloatingField } from "@/components/auth/floating-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import {
  createSignupEmailSchema,
  EMPTY_SIGNUP_EMAIL,
  type SignupEmailValues,
} from "./signup-schema";

/**
 * ขั้นที่หนึ่งของการสมัคร — กรอกอีเมลเพื่อขอลิงก์
 *
 * ยังไม่มีบัญชีเกิดขึ้นที่ขั้นนี้ และหน้าจอจะไม่บอกว่าอีเมลที่กรอกมีบัญชีอยู่แล้วหรือไม่ เพราะ backend
 * ตอบเหมือนกันทุกกรณีโดยตั้งใจ การบอกใบ้ตรงนี้จะทำให้ฟอร์มกลายเป็นเครื่องมือค้นว่าใครสมัครไว้แล้ว
 *
 * @param props.onSent - เรียกเมื่อขอลิงก์สำเร็จ พร้อมอีเมลที่ใช้ขอ
 */
export default function SignupEmailForm({
  onSent,
}: {
  readonly onSent: (email: string) => void;
}) {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");

  const form = useForm<SignupEmailValues>({
    resolver: zodResolver(
      createSignupEmailSchema(tv, tfl),
    ) as Resolver<SignupEmailValues>,
    defaultValues: EMPTY_SIGNUP_EMAIL,
    mode: "onTouched",
  });

  // วินาทีที่เหลือก่อนกดขอลิงก์ได้อีกครั้ง — ตั้งจาก `retry_after` ที่ backend ส่งมากับ 429 เท่านั้น
  // ปล่อยให้กดซ้ำได้ทันทีคือการเชิญให้เจอ 429 ใบเดิมซ้ำ ๆ ทั้งที่ระบบบอกเวลามาแล้ว
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: async (values: SignupEmailValues) => {
      const email = values.email.trim();
      await signupRequest(email);
      return email;
    },
    onSuccess: (email) => onSent(email),
    onError: (error) => {
      const seconds =
        error instanceof ApiError && error.code === ERROR_CODES.RATE_LIMITED
          ? (error.details as { retryAfter?: number } | undefined)?.retryAfter
          : undefined;
      if (seconds !== undefined && seconds > 0) setRetryAfter(seconds);
    },
  });

  const { reset: resetMutation } = mutation;

  // นับถอยหลังแล้วล้าง error ทิ้งเมื่อครบ — ถ้าไม่ reset ข้อความ "รออีก 0 วินาที" จะค้างอยู่บนจอ
  // ทั้งที่ปุ่มกลับมากดได้แล้ว
  useEffect(() => {
    if (retryAfter === null || retryAfter <= 0) return;
    const id = setTimeout(() => {
      if (retryAfter <= 1) {
        setRetryAfter(null);
        resetMutation();
      } else {
        setRetryAfter(retryAfter - 1);
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [retryAfter, resetMutation]);

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.code === ERROR_CODES.RATE_LIMITED
        ? retryAfter !== null
          ? t("signup.tooManyAttemptsIn", { seconds: retryAfter })
          : t("signup.tooManyAttempts")
        : isTransportError(mutation.error)
          ? t("errors.networkUnavailable")
          : mutation.error.message
      : mutation.error
        ? t("signup.sendFailed")
        : null;

  return (
    <AuthSplitShell
      title={t("signup.title")}
      subtitle={t("signup.emailStepDescription")}
    >
      <form
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="mt-4"
        noValidate
      >
        <FieldGroup className="gap-4">
          <FloatingField
            id="email"
            label={t("emailLabel")}
            type="email"
            autoComplete="email"
            register={form.register("email")}
            error={form.formState.errors.email?.message}
          />

          {errorMessage && <AuthFormAlert>{errorMessage}</AuthFormAlert>}

          <Button
            type="submit"
            className="group mt-0.5 h-10 w-full"
            disabled={mutation.isPending || retryAfter !== null}
          >
            {mutation.isPending ? (
              <>
                <span className="border-primary-foreground/30 border-t-primary-foreground inline-block size-4 animate-spin rounded-full border-2" />
                {t("signup.sending")}
              </>
            ) : retryAfter !== null ? (
              t("signup.resendIn", { seconds: retryAfter })
            ) : (
              <>
                {t("signup.sendLink")}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </FieldGroup>
      </form>

      <p className="text-muted-foreground mt-4 text-center text-xs">
        {t("haveAccount")}{" "}
        <Link
          to="/login"
          className="text-primary font-semibold underline-offset-4 hover:underline"
        >
          {t("signIn")}
        </Link>
      </p>

      <p className="text-muted-foreground/60 text-micro-legal mt-3 text-center leading-relaxed">
        {t.rich("registerTermsLine", {
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
