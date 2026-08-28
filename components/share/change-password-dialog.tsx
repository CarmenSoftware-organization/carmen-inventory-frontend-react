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
} from "./change-password-schema";
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
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={changePassword.isPending ? undefined : onOpenChange}
    >
      <DialogContent
        className="border-border/60 bg-background gap-6 rounded-xl border p-6 shadow-md sm:max-w-[425px] sm:rounded-2xl"
        showCloseButton={false}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col">
            <DialogTitle className="text-foreground font-semibold tracking-tight">
              {t("changePassword")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-0.5 text-xs">
              {t("changePasswordDesc")}
            </DialogDescription>
          </div>

          <form
            id="change-password-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-3"
          >
            <FieldGroup className="gap-4">
              <Field data-invalid={!!form.formState.errors.current_password}>
                <FieldLabel
                  htmlFor="current_password"
                  required
                  className="text-foreground/80 mb-1.5 font-medium"
                >
                  {t("currentPassword")}
                </FieldLabel>
                <InputCustom
                  id="current_password"
                  type="password"
                  placeholder={t("enterCurrentPassword")}
                  data-id="log-in-password"
                  autoComplete="current-password"
                  className="border-border/60 bg-muted/10 focus-visible:ring-ring h-9 rounded-md transition-colors focus-visible:ring-1"
                  disabled={changePassword.isPending}
                  {...form.register("current_password")}
                />
                <FieldError className="mt-1">
                  {form.formState.errors.current_password?.message}
                </FieldError>
              </Field>

              <Field data-invalid={!!form.formState.errors.new_password}>
                <FieldLabel
                  htmlFor="new_password"
                  required
                  className="text-foreground/80 mb-1.5 font-medium"
                >
                  {t("newPassword")}
                </FieldLabel>
                <InputCustom
                  id="new_password"
                  type="password"
                  placeholder={t("enterNewPassword")}
                  data-id="log-in-password"
                  autoComplete="new-password"
                  className="border-border/60 bg-muted/10 focus-visible:ring-ring h-9 rounded-md transition-colors focus-visible:ring-1"
                  {...form.register("new_password")}
                />
                <FieldError className="mt-1">
                  {form.formState.errors.new_password?.message}
                </FieldError>
              </Field>

              <Field data-invalid={!!form.formState.errors.confirm_password}>
                <FieldLabel
                  htmlFor="confirm_password"
                  required
                  className="text-foreground/80 mb-1.5 font-medium"
                >
                  {t("confirmPassword")}
                </FieldLabel>
                <InputCustom
                  id="confirm_password"
                  type="password"
                  placeholder={t("reenterPassword")}
                  data-id="log-in-password"
                  autoComplete="new-password"
                  className="border-border/60 bg-muted/10 focus-visible:ring-ring h-9 rounded-md transition-colors focus-visible:ring-1"
                  disabled={changePassword.isPending}
                  {...form.register("confirm_password")}
                />
                <FieldError className="mt-1">
                  {form.formState.errors.confirm_password?.message}
                </FieldError>
              </Field>
            </FieldGroup>
          </form>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={changePassword.isPending}
            className="border-border/60 hover:bg-muted/50 h-9 rounded-md px-4 font-medium shadow-sm transition-colors"
          >
            {tc("cancel")}
          </Button>
          <Button
            type="submit"
            form="change-password-form"
            disabled={changePassword.isPending}
            className="h-9 rounded-md px-4 font-medium shadow-sm transition-colors"
          >
            {changePassword.isPending ? t("changing") : t("changePassword")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
