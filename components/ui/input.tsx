import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Input component หลักของระบบ รองรับ counter ความยาวเมื่อมี maxLength (type text)
 * @param props - props ของ input element
 * @returns React element input (หรือ input + counter)
 */
function Input({
  className,
  type,
  maxLength,
  size = "default",
  ref: forwardedRef,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & {
  /** ความสูงให้ตรงกับ Select / LookupCombobox: xs=h-6 · sm=h-8 · default=h-9 */
  size?: "xs" | "sm" | "default";
}) {
  const [length, setLength] = React.useState(0);
  const [focused, setFocused] = React.useState(false);
  const innerRef = React.useRef<HTMLInputElement | null>(null);
  const showCounter = (type === "text" || !type) && maxLength != null;

  const handleRef = React.useCallback(
    (el: HTMLInputElement | null) => {
      innerRef.current = el;
      if (el && showCounter) setLength(el.value.length);
      if (typeof forwardedRef === "function") forwardedRef(el);
      else if (forwardedRef) forwardedRef.current = el;
    },
    [forwardedRef, showCounter],
  );

  const inputElement = (
    <input
      ref={showCounter ? handleRef : forwardedRef}
      type={type}
      data-slot="input"
      maxLength={maxLength}
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input disabled:bg-muted/60 w-full min-w-0 rounded-md border bg-background px-3 py-1 text-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-xs file:font-semibold disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // height ตรงกับ Select / LookupCombobox
        size === "default" && "h-9",
        size === "sm" && "h-8",
        size === "xs" && "h-6 px-2",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-2",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        type === "number" &&
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        className,
      )}
      {...props}
      onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
        e.currentTarget.select();
        if (showCounter) {
          setLength(e.currentTarget.value.length);
          setFocused(true);
        }
        props.onFocus?.(e);
      }}
      {...(showCounter && {
        onInput: (e: React.InputEvent<HTMLInputElement>) => {
          setLength(e.currentTarget.value.length);
          props.onInput?.(e);
        },
        onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
          setFocused(false);
          props.onBlur?.(e);
        },
      })}
    />
  );

  if (!showCounter) return inputElement;

  const nearLimit = maxLength !== undefined && length >= maxLength * 0.8;
  const showValue = focused || nearLimit;

  return (
    <div className="relative">
      {inputElement}
      <p
        className={cn(
          "pointer-events-none absolute top-full right-0 mt-0.5 text-right text-[0.5625rem] tabular-nums transition-opacity",
          showValue ? "opacity-100" : "opacity-0",
          nearLimit ? "text-warning" : "text-muted-foreground/60",
          length >= maxLength! && "text-destructive",
        )}
        aria-live="polite"
      >
        {length}/{maxLength}
      </p>
    </div>
  );
}

export { Input };
