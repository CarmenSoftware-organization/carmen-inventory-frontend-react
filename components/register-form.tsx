import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import { Link, useNavigate } from "react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { ApiError, ERROR_CODES } from "@/lib/api-error";
import { register as registerUser } from "@/lib/auth/auth-api";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import {
  AuthFormAlert,
  FloatingField,
  FloatingFieldPassword,
} from "@/components/auth/floating-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";

const PASSWORD_MIN = 6;
const USERNAME_MIN = 3;

type RegisterFormValues = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  telephone: string;
  password: string;
  confirmPassword: string;
};

export default function RegisterForm() {
  const navigate = useNavigate();
  const t = useTranslations("auth");

  const registerSchema = z
    .object({
      firstName: z.string().trim().min(1, t("validation.firstNameRequired")),
      lastName: z.string().trim().min(1, t("validation.lastNameRequired")),
      username: z
        .string()
        .trim()
        .min(1, t("validation.usernameRequired"))
        .min(USERNAME_MIN, t("validation.usernameMinChars", { min: USERNAME_MIN })),
      email: z
        .string()
        .min(1, t("validation.emailRequired"))
        .pipe(z.email(t("validation.emailInvalid"))),
      telephone: z.string().trim(),
      password: z
        .string()
        .min(1, t("validation.passwordRequired"))
        .min(PASSWORD_MIN, t("validation.passwordMinChars", { min: PASSWORD_MIN })),
      confirmPassword: z.string().min(1, t("validation.confirmPasswordRequired")),
    })
    .refine((v) => v.password === v.confirmPassword, {
      path: ["confirmPassword"],
      message: t("validation.passwordMismatch"),
    });

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema) as Resolver<RegisterFormValues>,
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      telephone: "",
      password: "",
      confirmPassword: "",
    },
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
        <FieldGroup className="gap-3">
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
            register={form.register("password")}
            error={form.formState.errors.password?.message}
          />

          <FloatingFieldPassword
            id="confirmPassword"
            label={t("confirmPasswordLabel")}
            showLabel={t("showPassword")}
            hideLabel={t("hidePassword")}
            autoComplete="new-password"
            register={form.register("confirmPassword")}
            error={form.formState.errors.confirmPassword?.message}
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
    </AuthSplitShell>
  );
}
