
import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { useChangePassword } from "@/hooks/use-profile";
import { useLogout } from "@/hooks/use-logout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface ChangePasswordDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

/**
 * Dialog สำหรับให้ผู้ใช้เปลี่ยนรหัสผ่าน เมื่อเปลี่ยนสำเร็จจะ logout อัตโนมัติ
 *
 * @param props - รับ open และ onOpenChange สำหรับควบคุมการแสดง dialog
 * @returns React element ของ dialog เปลี่ยนรหัสผ่าน
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 *
 * <ChangePasswordDialog open={open} onOpenChange={setOpen} />
 * ```
 */
export default function ChangePasswordDialog({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
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

  useEffect(() => {
    if (open) form.reset(EMPTY_PASSWORD_FORM);
  }, [open, form]);

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
    <Dialog
      open={open}
      onOpenChange={changePassword.isPending ? undefined : onOpenChange}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">{t("changePassword")}</DialogTitle>
          <DialogDescription className="text-xs">
            {t("changePasswordDesc")}
          </DialogDescription>
        </DialogHeader>
        <form
          id="change-password-form"
          onSubmit={form.handleSubmit(onSubmit)}
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
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={changePassword.isPending}
          >
            {tc("cancel")}
          </Button>
          <Button
            type="submit"
            form="change-password-form"
            size="sm"
            disabled={changePassword.isPending}
          >
            {changePassword.isPending ? t("changing") : t("changePassword")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
