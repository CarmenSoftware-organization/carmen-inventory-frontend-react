import { useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Floating-label input ของหน้า auth (login / register) — label ลอยขึ้นเป็น
 * eyebrow ตัวเล็กเมื่อ focus หรือมีค่า
 */

const FLOATING_INPUT_CLASS = cn(
  "border-border bg-background hover:border-foreground/40 focus-visible:border-primary",
  "h-12 rounded-lg border px-3 pt-4 pb-1 text-sm shadow-none transition-colors",
  "focus-visible:ring-primary/30 focus-visible:ring-2",
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
          ? "top-1 text-micro-eyebrow font-semibold tracking-widest uppercase"
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

export function FloatingField({
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

export function FloatingFieldPassword({
  id,
  label,
  showLabel,
  hideLabel,
  autoComplete = "current-password",
  dataId,
  register,
  error,
}: {
  readonly id: string;
  readonly label: string;
  readonly showLabel: string;
  readonly hideLabel: string;
  readonly autoComplete?: string;
  readonly dataId?: string;
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
          autoComplete={autoComplete}
          data-id={dataId}
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

export function FieldErrorText({
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
      className="text-destructive mt-1.5 text-xs font-semibold"
    >
      {children}
    </p>
  );
}

/** กล่องแจ้ง error ของฟอร์ม auth — เส้นขอบแดงบางๆ ตัวหนังสือแดง ไม่มีพื้นจัด */
export function AuthFormAlert({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <div
      className="border-destructive/40 bg-destructive/5 rounded-xl border px-3 py-2"
      style={{ animation: "fade-up-soft 0.3s ease-out both" }}
      role="alert"
      aria-live="polite"
    >
      <p className="text-destructive text-xs font-semibold">{children}</p>
    </div>
  );
}
