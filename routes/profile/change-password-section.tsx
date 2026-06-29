
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { useChangePassword } from "@/hooks/use-profile";
import { useLogout } from "@/hooks/use-logout";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  createChangePasswordSchema,
  EMPTY_PASSWORD_FORM,
  type ChangePasswordFormValues,
} from "./profile-form-schema";
import InputCustom from "@/components/ui/input-custom";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";

/**
 * ส่วนของฟอร์มเปลี่ยนรหัสผ่าน แสดงแบบ inline ภายในหน้าตั้งค่าโปรไฟล์
 *
 * @param - ไม่มี parameter
 * @returns React element ของส่วนเปลี่ยนรหัสผ่าน
 * @example
 * ```tsx
 * import ChangePasswordSection from "./change-password-section";
 *
 * <ChangePasswordSection />
 * ```
 */
export default function ChangePasswordSection() {
  const t = useTranslations("profile");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");
  const changePassword = useChangePassword();
  const logout = useLogout();

  const changePasswordSchema = createChangePasswordSchema(tv, tfl);
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(
      changePasswordSchema,
    ) as Resolver<ChangePasswordFormValues>,
    defaultValues: EMPTY_PASSWORD_FORM,
  });

  const onSubmit = (values: ChangePasswordFormValues) => {
    changePassword.mutate(
      {
        current_password: values.current_password,
        new_password: values.new_password,
      },
      {
        onSuccess: () => {
          toast.success(t("passwordChanged"));
          logout.mutate();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <form
      id="change-password-form"
      onSubmit={form.handleSubmit(onSubmit, () => scrollToFirstInvalidField())}
      className="space-y-3"
    >
      <FieldGroup className="gap-3">
        <Field data-invalid={!!form.formState.errors.current_password}>
          <FieldLabel htmlFor="current_password" required>
            {t("currentPassword")}
          </FieldLabel>
          <InputCustom
            id="current_password"
            type="password"
            placeholder={t("enterCurrentPassword")}
            data-id="log-in-password"
            autoComplete="current-password"
            className="h-8"
            disabled={changePassword.isPending}
            {...form.register("current_password")}
          />
          <FieldError>
            {form.formState.errors.current_password?.message}
          </FieldError>
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field data-invalid={!!form.formState.errors.new_password}>
            <FieldLabel htmlFor="new_password" required>
              {t("newPassword")}
            </FieldLabel>
            <InputCustom
              id="new_password"
              type="password"
              placeholder={t("enterNewPassword")}
              data-id="log-in-password"
              autoComplete="new-password"
              className="h-8"
              {...form.register("new_password")}
            />
            <FieldError>
              {form.formState.errors.new_password?.message}
            </FieldError>
          </Field>

          <Field data-invalid={!!form.formState.errors.confirm_password}>
            <FieldLabel htmlFor="confirm_password" required>
              {t("confirmPassword")}
            </FieldLabel>
            <InputCustom
              id="confirm_password"
              type="password"
              placeholder={t("reenterPassword")}
              data-id="log-in-password"
              autoComplete="new-password"
              className="h-8"
              disabled={changePassword.isPending}
              {...form.register("confirm_password")}
            />
            <FieldError>
              {form.formState.errors.confirm_password?.message}
            </FieldError>
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={changePassword.isPending}>
            {changePassword.isPending ? t("changing") : t("changePassword")}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
