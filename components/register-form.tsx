import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import { Link, useNavigate } from "react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { ApiError, ERROR_CODES } from "@/lib/api-error";
import { register as registerUser } from "@/lib/auth/auth-api";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-schema";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import {
  AuthFormAlert,
  FloatingField,
  FloatingFieldPassword,
} from "@/components/auth/floating-field";
import {
  createRegisterSchema,
  EMPTY_REGISTER_FORM,
  type RegisterFormValues,
} from "@/components/auth/register-form-schema";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";

export default function RegisterForm() {
  const navigate = useNavigate();
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(
      createRegisterSchema(tv, tfl),
    ) as Resolver<RegisterFormValues>,
    defaultValues: EMPTY_REGISTER_FORM,
    mode: "onTouched",
  });

  const registerMutation = useMutation({
    mutationFn: async (values: RegisterFormValues) => {
      try {
        await registerUser({
          username: values.username.trim(),
          email: values.email.trim(),
          password: values.password,
          user_info: {
            first_name: values.firstName.trim(),
            middle_name: "",
            last_name: values.lastName.trim(),
            ...(values.telephone.trim()
              ? { telephone: values.telephone.trim() }
              : {}),
          },
        });
      } catch (err) {
        if (
          err instanceof ApiError &&
          err.code === ERROR_CODES.VALIDATION_ERROR
        ) {
          throw new Error(err.message || t("errors.registerConflict"));
        }
        throw err;
      }
    },
  });

  if (registerMutation.isSuccess) {
    return (
      <AuthSplitShell
        title={t("registerDoneTitle")}
        subtitle={t("registerDoneSubtitle")}
      >
        <div
          className="mt-5 flex flex-col items-center gap-3 text-center"
          style={{ animation: "fade-up-soft 0.4s ease-out both" }}
        >
          <CheckCircle2 className="text-positive-ink size-8" />
          <p className="text-muted-foreground text-xs leading-relaxed">
            {t("registerDoneHint")}
          </p>
          <Button
            className="group mt-1 h-10 w-full"
            onClick={() => navigate("/login")}
          >
            {t("goToSignIn")}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </AuthSplitShell>
    );
  }

  return (
    <AuthSplitShell title={t("createTitle")} subtitle={t("createSubtitle")}>
      <form
        onSubmit={form.handleSubmit((values) => registerMutation.mutate(values))}
        className="mt-4"
        noValidate
      >
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
            id="username"
            label={t("usernameLabel")}
            autoComplete="username"
            register={form.register("username")}
            error={form.formState.errors.username?.message}
          />

          <FloatingField
            id="email"
            label={t("emailLabel")}
            type="email"
            autoComplete="email"
            register={form.register("email")}
            error={form.formState.errors.email?.message}
          />

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

          {registerMutation.isError && (
            <AuthFormAlert>{registerMutation.error.message}</AuthFormAlert>
          )}

          <Button
            type="submit"
            className="group mt-0.5 h-10 w-full"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? (
              <>
                <span className="border-primary-foreground/30 border-t-primary-foreground inline-block size-4 animate-spin rounded-full border-2" />
                {t("creatingAccount")}
              </>
            ) : (
              <>
                {t("createAccount")}
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

      <p className="text-muted-foreground/60 mt-3 text-center text-micro-legal leading-relaxed">
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
