import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Textarea component พร้อม character counter เมื่อมี maxLength
 * @param props - props ของ textarea มาตรฐาน (maxLength, ref, ฯลฯ)
 * @returns React element textarea พร้อม counter overlay
 */
function Textarea({
  className,
  maxLength,
  ref: forwardedRef,
  ...props
}: React.ComponentProps<"textarea">) {
  const [length, setLength] = React.useState(0)
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null)
  const showCounter = maxLength != null

  const handleRef = React.useCallback(
    (el: HTMLTextAreaElement | null) => {
      innerRef.current = el
      if (el && showCounter) setLength(el.value.length)
      if (typeof forwardedRef === "function") forwardedRef(el)
      else if (forwardedRef) forwardedRef.current = el
    },
    [forwardedRef, showCounter],
  )

  const textareaElement = (
    <textarea
      ref={showCounter ? handleRef : forwardedRef}
      data-slot="textarea"
      maxLength={maxLength}
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-md border bg-background px-3 py-2 text-xs shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        showCounter && "pb-5",
        className,
      )}
      {...props}
      onFocus={(e: React.FocusEvent<HTMLTextAreaElement>) => {
        e.currentTarget.select()
        if (showCounter) setLength(e.currentTarget.value.length)
        props.onFocus?.(e)
      }}
      {...(showCounter && {
        onInput: (e: React.InputEvent<HTMLTextAreaElement>) => {
          setLength(e.currentTarget.value.length)
          props.onInput?.(e)
        },
      })}
    />
  )

  if (!showCounter) return textareaElement

  return (
    <div className="relative">
      {textareaElement}
      <span className="pointer-events-none absolute bottom-1.5 right-2 text-[0.5625rem] tabular-nums text-muted-foreground/60">
        {length}/{maxLength}
      </span>
    </div>
  )
}

export { Textarea }
