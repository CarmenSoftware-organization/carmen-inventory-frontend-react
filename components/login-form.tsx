import { useEffect, useRef, useState } from "react";
import {
  useForm,
  type Resolver,
  type UseFormRegisterReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import { useRouter, useSearchParams } from "@/lib/compat/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Hotel,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { profileQueryKey } from "@/hooks/use-profile";
import { ApiError, ERROR_CODES } from "@/lib/api-error";
import { login } from "@/lib/auth/auth-api";
import { resolveNextPath } from "@/lib/auth/resolve-next-path";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import brandingUrl from "./icons/carmen-branding.svg";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const t = useTranslations("auth");
  const orbsRef = useRef<HTMLDivElement | null>(null);
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

  // Mouse parallax on orbs (subtle ±0.75rem shift)
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (!orbsRef.current) return;
      const x = (e.clientX / globalThis.innerWidth - 0.5) * 12;
      const y = (e.clientY / globalThis.innerHeight - 0.5) * 12;
      orbsRef.current.style.setProperty("--mx", `${x}px`);
      orbsRef.current.style.setProperty("--my", `${y}px`);
    };
    globalThis.addEventListener("mousemove", handle);
    return () => globalThis.removeEventListener("mousemove", handle);
  }, []);

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
      router.push(resolveNextPath(searchParams.get("next")));
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
    <div className="bg-background relative isolate min-h-svh overflow-hidden">
      {/* Inline keyframes for slow orb drift */}
      <style>{`
        @keyframes orb-drift-1 { 0%, 100% { transform: translate(var(--mx, 0), var(--my, 0)); } 50% { transform: translate(calc(var(--mx, 0) + 1.5rem), calc(var(--my, 0) - 2rem)); } }
        @keyframes orb-drift-2 { 0%, 100% { transform: translate(var(--mx, 0), var(--my, 0)); } 50% { transform: translate(calc(var(--mx, 0) - 2rem), calc(var(--my, 0) + 1.5rem)); } }
        @keyframes orb-drift-3 { 0%, 100% { transform: translate(var(--mx, 0), var(--my, 0)); } 50% { transform: translate(calc(var(--mx, 0) + 2.5rem), calc(var(--my, 0) + 1rem)); } }
        @keyframes shine-sweep { 0% { transform: translateX(-150%) skewX(-20deg); } 100% { transform: translateX(250%) skewX(-20deg); } }
        @keyframes title-reveal {
          0% { opacity: 0; transform: translateY(0.75rem); filter: blur(0.25rem); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes fade-up-soft {
          0% { opacity: 0; transform: translateY(0.5rem); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Background orbs (parallax + drift) ───────────── */}
      <div
        ref={orbsRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div
          className="absolute top-[-20%] left-[-10%] h-160 w-160 rounded-full opacity-70 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--primary), transparent 60%) 0%, transparent 70%)",
            animation: "orb-drift-1 18s ease-in-out infinite",
          }}
        />
        <div
          className="absolute top-[10%] right-[-15%] h-144 w-xl rounded-full opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--chart-3), transparent 65%) 0%, transparent 70%)",
            animation: "orb-drift-2 22s ease-in-out infinite",
          }}
        />
        <div
          className="absolute bottom-[-15%] left-[20%] h-176 w-176 rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--chart-2), transparent 70%) 0%, transparent 70%)",
            animation: "orb-drift-3 26s ease-in-out infinite",
          }}
        />
        <div
          className="absolute right-[8%] bottom-[10%] h-112 w-md rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--primary), transparent 65%) 0%, transparent 70%)",
            animation: "orb-drift-2 20s ease-in-out infinite reverse",
          }}
        />
      </div>

      {/* Subtle grain overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* ── 50/50 cinematic split ────────────────────────── */}
      <div className="relative grid h-svh lg:grid-cols-2">
        {/* ╔══ LEFT — Form (focused glass card) ═══════════════════╗ */}
        <div className="flex items-center justify-center px-5 py-6 sm:px-8">
          <div
            className="w-full max-w-md"
            style={{ animation: "fade-up-soft 0.6s ease-out 0.1s both" }}
          >
            {/* Mobile-only branding */}
            <div className="mb-5 lg:hidden">
              <BrandMark size="sm" />
            </div>

            {/* Glass card */}
            <div className="border-border/40 bg-card/50 relative overflow-hidden rounded-2xl border p-5 shadow-[0_2rem_4rem_-1rem_color-mix(in_oklch,var(--primary),transparent_82%),0_0.5rem_1.5rem_-0.5rem_rgba(0,0,0,0.05)] backdrop-blur-2xl sm:p-6">
              {/* Inner highlight */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)",
                }}
              />

              <div className="relative">
                <span className="bg-primary/10 text-primary border-primary/15 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.5625rem] font-bold tracking-widest uppercase backdrop-blur-sm">
                  <Sparkles className="size-2.5" />
                  {t("eyebrow")}
                </span>
                <h1
                  className="mt-2 text-2xl leading-[1.05] font-semibold tracking-tight sm:text-[1.75rem]"
                  style={{ animation: "title-reveal 0.7s ease-out 0.2s both" }}
                >
                  {t("welcomeBack")}
                </h1>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  {t("subtitle")}
                </p>

                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="mt-4"
                  noValidate
                >
                  <FieldGroup className="gap-3">
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
                      register={form.register("password")}
                      error={form.formState.errors.password?.message}
                    />

                    {loginMutation.isError && (
                      <div
                        className="border-destructive/40 bg-destructive/5 rounded-xl border px-3 py-2"
                        style={{
                          animation: "fade-up-soft 0.3s ease-out both",
                        }}
                        role="alert"
                        aria-live="polite"
                      >
                        <p className="text-destructive text-xs font-medium">
                          {loginMutation.error instanceof RateLimitError &&
                          retryAfter !== null
                            ? t("errors.tooManyAttempts", {
                                seconds: retryAfter,
                              })
                            : loginMutation.error.message}
                        </p>
                      </div>
                    )}

                    <ShineButton
                      type="submit"
                      disabled={loginMutation.isPending || retryAfter !== null}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <span className="border-primary-foreground/30 border-t-primary-foreground text-foreground inline-block size-4 animate-spin rounded-full border-2" />
                          <span className="text-background">
                            {t("signingIn")}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-background">{t("signIn")}</span>
                          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </ShineButton>
                  </FieldGroup>
                </form>

                <p className="text-muted-foreground/60 mt-4 text-center text-[0.625rem] leading-relaxed">
                  {t.rich("termsLine", {
                    terms: (chunks) => (
                      <span className="text-foreground/70 underline-offset-4 hover:underline">
                        {chunks}
                      </span>
                    ),
                    privacy: (chunks) => (
                      <span className="text-foreground/70 underline-offset-4 hover:underline">
                        {chunks}
                      </span>
                    ),
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ╔══ RIGHT — Cinematic hero ═══════════════════════════ */}
        <div className="relative hidden items-center overflow-hidden lg:flex">
          <div
            className="relative w-full px-10 py-8 xl:px-14"
            style={{ animation: "fade-up-soft 0.7s ease-out 0.2s both" }}
          >
            {/* Brand */}
            <div className="flex items-center gap-3">
              <BrandMark size="lg" />
            </div>

            {/* Cinematic headline — compact */}
            <h2
              className="mt-6 max-w-[24ch] text-[2.25rem] leading-[1.05] font-semibold tracking-[-0.03em] xl:text-[2.75rem]"
              style={{ animation: "title-reveal 0.9s ease-out 0.35s both" }}
            >
              {t("heroHeadlineStart")}{" "}
              <span
                className="from-primary via-primary to-chart-3 inline-block bg-linear-to-r bg-clip-text text-transparent"
                style={{
                  backgroundSize: "200% 100%",
                  animation: "shimmer 8s ease-in-out infinite alternate",
                }}
              >
                {t("heroHeadlineEmphasis")}
              </span>
            </h2>
            <style>{`@keyframes shimmer { 0% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }`}</style>

            <p
              className="text-muted-foreground/90 mt-3 max-w-md text-[0.8125rem] leading-relaxed"
              style={{ animation: "fade-up-soft 0.7s ease-out 0.5s both" }}
            >
              {t("heroDescription")}
            </p>

            {/* Bento feature grid — compact */}
            <div
              className="mt-5 grid grid-cols-2 gap-2"
              style={{ animation: "fade-up-soft 0.7s ease-out 0.7s both" }}
            >
              <BentoCard
                icon={Zap}
                title={t("features.liveStockTitle")}
                desc={t("features.liveStockDesc")}
              />
              <BentoCard
                icon={ShieldCheck}
                title={t("features.roleAwareTitle")}
                desc={t("features.roleAwareDesc")}
              />
              <BentoCard
                icon={Hotel}
                title={t("features.multiPropertyTitle")}
                desc={t("features.multiPropertyDesc")}
              />
              <BentoCard
                icon={Sparkles}
                title={t("features.hospitalityTitle")}
                desc={t("features.hospitalityDesc")}
              />
            </div>

            {/* Tagline footer */}
            <div
              className="mt-6 flex items-center gap-2"
              style={{ animation: "fade-up-soft 0.7s ease-out 0.9s both" }}
            >
              <div className="bg-primary size-1 rounded-full" />
              <p className="text-muted-foreground text-[0.6875rem] font-medium tracking-wide italic">
                {t("letsBegin")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-muted-foreground/40 pointer-events-none absolute right-0 bottom-2 left-0 z-10 text-center text-[0.625rem]">
        {t("platformFooter")}
      </p>
    </div>
  );
}

/* ── Brand atoms ─────────────────────────────────────── */

function BrandMark({ size = "sm" }: { readonly size?: "sm" | "lg" }) {
  return (
    <img
      src={brandingUrl}
      alt="Carmen"
      className={size === "lg" ? "h-18 w-auto" : "h-7 w-auto"}
    />
  );
}

/* ── Floating-label input ────────────────────────────── */

const FLOATING_INPUT_CLASS = cn(
  "border-border/40 bg-background/40 hover:border-foreground/40 focus-visible:border-primary",
  "h-12 rounded-lg border px-3 pt-4 pb-1 text-sm shadow-none transition-all",
  "focus-visible:shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary),transparent_88%)] focus-visible:ring-0",
);

function FloatingLabel({
  htmlFor,
  children,
  isFloating,
  hasError,
}: {
  readonly htmlFor: string;
  readonly children: React.ReactNode;
  readonly isFloating: boolean;
  readonly hasError?: boolean;
}) {
  return (
    <FieldLabel
      htmlFor={htmlFor}
      className={cn(
        "pointer-events-none absolute left-3 z-10 transition-all duration-150",
        isFloating
          ? "top-1 text-[0.5625rem] font-semibold tracking-widest uppercase"
          : "top-1/2 -translate-y-1/2 text-xs",
        getLabelTone(isFloating, hasError),
      )}
    >
      {children}
    </FieldLabel>
  );
}

function getLabelTone(isFloating: boolean, hasError?: boolean) {
  if (hasError) return "text-destructive";
  if (isFloating) return "text-primary";
  return "text-muted-foreground/80";
}

function useFloatingState(register: UseFormRegisterReturn) {
  const [focused, setFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);

  const handlers = {
    onFocus: () => setFocused(true),
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      setHasValue(e.target.value.length > 0);
      void register.onBlur(e);
    },
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0);
      void register.onChange(e);
    },
  };

  return { isFloating: focused || hasValue, handlers };
}

function FloatingField({
  id,
  label,
  type = "text",
  autoComplete,
  register,
  error,
}: {
  readonly id: string;
  readonly label: string;
  readonly type?: string;
  readonly autoComplete?: string;
  readonly register: UseFormRegisterReturn;
  readonly error?: string;
}) {
  const { isFloating, handlers } = useFloatingState(register);

  return (
    <Field>
      <div className="relative">
        <FloatingLabel htmlFor={id} isFloating={isFloating} hasError={!!error}>
          {label}
        </FloatingLabel>
        <Input
          id={id}
          type={type}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          className={cn(FLOATING_INPUT_CLASS, error && "border-destructive")}
          {...register}
          {...handlers}
        />
      </div>
      {error && <FieldErrorText id={`${id}-error`}>{error}</FieldErrorText>}
    </Field>
  );
}

function FloatingFieldPassword({
  id,
  label,
  showLabel,
  hideLabel,
  register,
  error,
}: {
  readonly id: string;
  readonly label: string;
  readonly showLabel: string;
  readonly hideLabel: string;
  readonly register: UseFormRegisterReturn;
  readonly error?: string;
}) {
  const { isFloating, handlers } = useFloatingState(register);
  const [show, setShow] = useState(false);

  return (
    <Field>
      <div className="relative">
        <FloatingLabel htmlFor={id} isFloating={isFloating} hasError={!!error}>
          {label}
        </FloatingLabel>
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete="current-password"
          data-id="log-in-password"
          aria-invalid={!!error}
          className={cn(
            FLOATING_INPUT_CLASS,
            "pr-12",
            error && "border-destructive",
          )}
          {...register}
          {...handlers}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? hideLabel : showLabel}
          tabIndex={-1}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 transition-colors"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error && <FieldErrorText id={`${id}-error`}>{error}</FieldErrorText>}
    </Field>
  );
}

function FieldErrorText({
  id,
  children,
}: {
  readonly id: string;
  readonly children: React.ReactNode;
}) {
  return (
    <p
      id={id}
      role="alert"
      className="text-destructive mt-1.5 text-xs font-medium"
    >
      {children}
    </p>
  );
}

/* ── Submit button with shine sweep ─────────────────── */

function ShineButton({
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      className="from-primary to-primary/85 hover:to-primary group relative mt-0.5 h-10 w-full overflow-hidden rounded-lg bg-linear-to-br text-sm font-semibold shadow-[0_0.5rem_1.25rem_-0.25rem_color-mix(in_oklch,var(--primary),transparent_55%)] transition-all hover:shadow-[0_0.75rem_1.75rem_-0.25rem_color-mix(in_oklch,var(--primary),transparent_45%)] hover:brightness-105"
    >
      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {children}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 h-full w-1/3 bg-linear-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100"
        style={{
          animation: "shine-sweep 1.2s ease-out infinite",
        }}
      />
    </Button>
  );
}

/* ── Bento card for feature grid ────────────────────── */

function BentoCard({
  icon: Icon,
  title,
  desc,
}: {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly title: string;
  readonly desc: string;
}) {
  return (
    <div className="border-border/40 bg-card/40 hover:border-primary/30 hover:bg-card/60 group relative overflow-hidden rounded-xl border p-3 backdrop-blur-xl transition-all">
      <div
        aria-hidden
        className="from-primary/10 absolute -top-10 -right-10 size-24 rounded-full bg-linear-to-br to-transparent opacity-0 blur-2xl transition-opacity group-hover:opacity-100"
      />
      <div className="relative">
        <div className="bg-primary/10 text-primary mb-2 flex size-7 items-center justify-center rounded-lg">
          <Icon className="size-3.5" />
        </div>
        <div className="text-foreground text-xs font-semibold tracking-tight">
          {title}
        </div>
        <p className="text-muted-foreground mt-0.5 text-[0.6875rem] leading-snug">
          {desc}
        </p>
      </div>
    </div>
  );
}
