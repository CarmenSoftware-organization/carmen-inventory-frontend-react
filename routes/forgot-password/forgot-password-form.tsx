import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { ApiError, isTransportError } from "@/lib/api-error";
import { forgotPassword } from "@/lib/auth/auth-api";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { AuthFormAlert, FloatingField } from "@/components/auth/floating-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";

type ForgotPasswordValues = { email: string };

/**
 * ขั้นที่หนึ่งของการกู้คืนรหัสผ่าน — กรอกอีเมลเพื่อขอลิงก์ตั้งรหัสใหม่
 *
 * หน้าจอนี้ไม่บอกว่าอีเมลที่กรอกมีบัญชีอยู่หรือไม่ และบอกไม่ได้ด้วยเพราะ `forgotPassword()`
 * กลืน 404 ไปตั้งแต่ชั้น API แล้ว ทุกอีเมลที่ผ่าน validation จึงเดินต่อไปหน้า "ตรวจกล่องจดหมาย"
 * เหมือนกันหมด
 *
 * @param props.onSent - เรียกเมื่อขอลิงก์สำเร็จ พร้อมอีเมลที่ใช้ขอ
 */
export default function ForgotPasswordForm({
  onSent,
}: {
  readonly onSent: (email: string) => void;
}) {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");

  const schema = z.object({
    email: z
      .string()
      .trim()
      .min(1, tv("required", { field: tfl("email") }))
      .pipe(z.email(tv("invalidEmail"))),
  });

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(schema) as Resolver<ForgotPasswordValues>,
    defaultValues: { email: "" },
    mode: "onTouched",
  });

  const mutation = useMutation({
    mutationFn: async (values: ForgotPasswordValues) => {
      const email = values.email.trim();
      await forgotPassword(email);
      return email;
    },
    onSuccess: (email) => onSent(email),
    // ฟอร์มนี้แสดงความผิดพลาดในตัวเองอยู่แล้ว toast กลางจึงเป็นข้อความซ้อนที่แปลจากรหัส HTTP
    // ล้วน ๆ — 400 กลายเป็น "ข้อมูลที่จำเป็นไม่ครบถ้วน" ซึ่งไม่ใช่สิ่งที่เกิดขึ้นตรงนี้เลย
    meta: { skipGlobalErrorToast: true },
  });

  // endpoint นี้ยังไม่มี rate limit ฝั่ง backend จึงไม่มีเคส 429 ให้จัดการแบบเส้นทางสมัคร —
  // ถ้าวันหนึ่ง backend เพิ่มมา ข้อความจะตกมาที่ `message` ของ ApiError ซึ่งอ่านรู้เรื่องอยู่แล้ว
  const errorMessage =
    mutation.error instanceof ApiError
      ? isTransportError(mutation.error)
        ? t("errors.networkUnavailable")
        : mutation.error.message
      : mutation.error
        ? t("forgotPassword.sendFailed")
        : null;

  return (
    <AuthSplitShell
      title={t("forgotPassword.title")}
      subtitle={t("forgotPassword.emailStepDescription")}
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
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <span className="border-primary-foreground/30 border-t-primary-foreground inline-block size-4 animate-spin rounded-full border-2" />
                {t("forgotPassword.sending")}
              </>
            ) : (
              <>
                {t("forgotPassword.sendLink")}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </FieldGroup>
      </form>

      <p className="text-muted-foreground mt-4 text-center text-xs">
        {t("forgotPassword.rememberedPassword")}{" "}
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
