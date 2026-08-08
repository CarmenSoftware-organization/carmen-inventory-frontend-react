import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { ArrowRight } from "lucide-react";
import { profileQueryKey } from "@/hooks/use-profile";
import { ApiError, ERROR_CODES } from "@/lib/api-error";
import { login } from "@/lib/auth/auth-api";
import { resolveNextPath } from "@/lib/auth/resolve-next-path";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import {
  AuthFormAlert,
  FloatingField,
  FloatingFieldPassword,
} from "@/components/auth/floating-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";

const PASSWORD_MIN = 6;

type LoginFormValues = {
  email: string;
  password: string;
};

class RateLimitError extends Error {
  constructor(public readonly retryAfter: number) {
    super("");
    this.name = "RateLimitError";
  }
}

export default function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  // ตั้งโดย /register/verify หลังสร้างบัญชีสำเร็จ — เป็น router state ไม่ใช่ query string
  // จึงหายไปเองเมื่อรีเฟรช ซึ่งถูกแล้ว เพราะข้อความนี้ควรเห็นครั้งเดียว
  const justRegistered =
    (location.state as { justRegistered?: boolean } | null)?.justRegistered ===
    true;
  const t = useTranslations("auth");
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const loginSchema = z.object({
    email: z
      .string()
      .min(1, t("validation.emailRequired"))
      .pipe(z.email(t("validation.emailInvalid"))),
    password: z
      .string()
      .min(1, t("validation.passwordRequired"))
      .min(
        PASSWORD_MIN,
        t("validation.passwordMinChars", { min: PASSWORD_MIN }),
      ),
  });

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema) as Resolver<LoginFormValues>,
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  useEffect(() => {
    queryClient.removeQueries({ queryKey: profileQueryKey });
  }, [queryClient]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginFormValues) => {
      try {
        return await login(credentials.email, credentials.password);
      } catch (err) {
        if (err instanceof ApiError && err.code === ERROR_CODES.UNAUTHORIZED) {
          throw new Error(t("errors.invalidCredentials"));
        }
        if (err instanceof ApiError && err.code === ERROR_CODES.RATE_LIMITED) {
          const seconds = (err.details as { retryAfter?: number } | undefined)
            ?.retryAfter;
          if (seconds && seconds > 0) {
            throw new RateLimitError(seconds);
          }
          throw new Error(t("errors.tooManyAttemptsFallback"));
        }
        throw err;
      }
    },
    // Profile is no longer returned by login(); it loads via ProfileGate /
    // use-profile after redirect, so we no longer seed the profile cache here.
    onSuccess: () => {
      navigate(resolveNextPath(searchParams.get("next")));
    },
  });

  const { reset: resetMutation } = loginMutation;

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

  const onSubmit = (values: LoginFormValues) => {
    loginMutation.reset();
    loginMutation.mutate(values, {
      onError: (err) => {
        form.setValue("password", "");
        if (err instanceof RateLimitError) {
          setRetryAfter(err.retryAfter);
        }
      },
    });
  };

  return (
    <AuthSplitShell title={t("welcomeBack")} subtitle={t("subtitle")}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4" noValidate>
        <FieldGroup className="gap-3">
          {justRegistered && !loginMutation.isError && (
            <div
              className="border-positive-ink/40 bg-positive-ink/5 rounded-xl border px-3 py-2"
              style={{ animation: "fade-up-soft 0.3s ease-out both" }}
              role="status"
              aria-live="polite"
            >
              <p className="text-positive-ink text-xs font-semibold">
                {t("signup.accountReady")}
              </p>
            </div>
          )}

          <FloatingField
            id="email"
            label={t("emailLabel")}
            type="email"
            autoComplete="email"
            register={form.register("email")}
            error={form.formState.errors.email?.message}
          />

          <FloatingFieldPassword
            id="password"
            label={t("passwordLabel")}
            showLabel={t("showPassword")}
            hideLabel={t("hidePassword")}
            dataId="log-in-password"
            register={form.register("password")}
            error={form.formState.errors.password?.message}
          />

          {loginMutation.isError && (
            <AuthFormAlert>
              {loginMutation.error instanceof RateLimitError &&
              retryAfter !== null
                ? t("errors.tooManyAttempts", { seconds: retryAfter })
                : loginMutation.error.message}
            </AuthFormAlert>
          )}

          <Button
            type="submit"
            className="group mt-0.5 h-10 w-full"
            disabled={loginMutation.isPending || retryAfter !== null}
          >
            {loginMutation.isPending ? (
              <>
                <span className="border-primary-foreground/30 border-t-primary-foreground inline-block size-4 animate-spin rounded-full border-2" />
                {t("signingIn")}
              </>
            ) : (
              <>
                {t("signIn")}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </FieldGroup>
      </form>

      <p className="text-muted-foreground mt-4 text-center text-xs">
        {t("noAccount")}{" "}
        <Link
          to="/register"
          className="text-primary font-semibold underline-offset-4 hover:underline"
        >
          {t("createAccount")}
        </Link>
      </p>

      <p className="text-muted-foreground/60 mt-3 text-center text-micro-legal leading-relaxed">
        {t.rich("termsLine", {
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
