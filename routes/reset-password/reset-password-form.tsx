import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "use-intl";
import { ArrowRight } from "lucide-react";
import {
  AuthFormAlert,
  FloatingFieldPassword,
} from "@/components/auth/floating-field";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-schema";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import {
  createResetPasswordSchema,
  EMPTY_RESET_PASSWORD,
  type ResetPasswordValues,
} from "./reset-password-schema";

/**
 * ฟอร์มตั้งรหัสผ่านใหม่ — รหัสใหม่กับช่องยืนยัน
 *
 * state ของฟอร์มอยู่ในคอมโพเนนต์นี้เอง เมื่อ submit ล้มเหลวสิ่งที่กรอกไว้จึงยังอยู่ครบ
 *
 * @param props.onSubmit - เรียกเมื่อฟอร์มผ่าน validation แล้ว
 * @param props.isPending - กำลังส่งอยู่ ใช้ปิดปุ่ม
 * @param props.errorMessage - ข้อความผิดพลาดจากผู้เรียก หรือ null เมื่อไม่มี
 */
export default function ResetPasswordForm({
  onSubmit,
  isPending,
  errorMessage,
}: {
  readonly onSubmit: (values: ResetPasswordValues) => void;
  readonly isPending: boolean;
  readonly errorMessage: string | null;
}) {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(
      createResetPasswordSchema(tv),
    ) as Resolver<ResetPasswordValues>,
    defaultValues: EMPTY_RESET_PASSWORD,
    mode: "onTouched",
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4" noValidate>
      <FieldGroup className="gap-4">
        <FloatingFieldPassword
          id="password"
          label={t("resetPassword.newPasswordLabel")}
          showLabel={t("showPassword")}
          hideLabel={t("hidePassword")}
          autoComplete="new-password"
          hint={t("passwordHint", { min: PASSWORD_MIN_LENGTH })}
          register={form.register("password")}
          error={form.formState.errors.password?.message}
        />

        <FloatingFieldPassword
          id="confirm_password"
          label={t("confirmPasswordLabel")}
          showLabel={t("showPassword")}
          hideLabel={t("hidePassword")}
          autoComplete="new-password"
          register={form.register("confirm_password")}
          error={form.formState.errors.confirm_password?.message}
        />

        {errorMessage && <AuthFormAlert>{errorMessage}</AuthFormAlert>}

        <Button
          type="submit"
          className="group mt-0.5 h-10 w-full"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <span className="border-primary-foreground/30 border-t-primary-foreground inline-block size-4 animate-spin rounded-full border-2" />
              {t("resetPassword.saving")}
            </>
          ) : (
            <>
              {t("resetPassword.submit")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </FieldGroup>
    </form>
  );
}
