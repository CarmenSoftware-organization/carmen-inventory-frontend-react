import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "use-intl";
import { ArrowRight } from "lucide-react";
import {
  AuthFormAlert,
  FloatingField,
  FloatingFieldPassword,
} from "@/components/auth/floating-field";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-schema";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import {
  createSignupProfileSchema,
  EMPTY_SIGNUP_PROFILE,
  type SignupProfileValues,
} from "./signup-schema";

/**
 * ฟอร์มโปรไฟล์และรหัสผ่าน ใช้ร่วมกันที่ `/register/verify` และหน้ารับคำเชิญ
 *
 * ไม่มีช่องอีเมล เพราะทั้งสองที่รู้อีเมลอยู่แล้วจากสิ่งที่พิสูจน์ความเป็นเจ้าของมา (token สมัคร หรือ
 * ตัวคำเชิญ) การให้กรอกอีเมลเองจะเปิดช่องให้สร้างบัญชีบนอีเมลที่ไม่ได้พิสูจน์
 *
 * ตัว state ของฟอร์มอยู่ในคอมโพเนนต์นี้ ผู้เรียกจึงไม่ต้องถือไว้ และเมื่อ submit ล้มเหลว
 * สิ่งที่กรอกไว้ยังอยู่ครบ
 *
 * @param props.onSubmit - เรียกเมื่อฟอร์มผ่าน validation แล้ว
 * @param props.isPending - กำลังส่งอยู่ ใช้ปิดปุ่ม
 * @param props.errorMessage - ข้อความผิดพลาดจากผู้เรียก หรือ null เมื่อไม่มี
 * @param props.submitLabel - ป้ายบนปุ่มส่ง ต่างกันระหว่างสมัครกับรับคำเชิญ
 */
export default function SignupProfileForm({
  onSubmit,
  isPending,
  errorMessage,
  submitLabel,
}: {
  readonly onSubmit: (values: SignupProfileValues) => void;
  readonly isPending: boolean;
  readonly errorMessage: string | null;
  readonly submitLabel: string;
}) {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");

  const form = useForm<SignupProfileValues>({
    resolver: zodResolver(
      createSignupProfileSchema(tv, tfl),
    ) as Resolver<SignupProfileValues>,
    defaultValues: EMPTY_SIGNUP_PROFILE,
    mode: "onTouched",
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4" noValidate>
      <FieldGroup className="gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FloatingField
            id="firstName"
            label={t("firstNameLabel")}
            autoComplete="given-name"
            register={form.register("firstName")}
            error={form.formState.errors.firstName?.message}
          />
          <FloatingField
            id="lastName"
            label={t("lastNameLabel")}
            autoComplete="family-name"
            register={form.register("lastName")}
            error={form.formState.errors.lastName?.message}
          />
        </div>

        <FloatingField
          id="telephone"
          label={t("telephoneLabel")}
          type="tel"
          autoComplete="tel"
          register={form.register("telephone")}
          error={form.formState.errors.telephone?.message}
        />

        <FloatingFieldPassword
          id="password"
          label={t("passwordLabel")}
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
              {submitLabel}
            </>
          ) : (
            <>
              {submitLabel}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </FieldGroup>
    </form>
  );
}
