
import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RecipeNameFieldLabels {
  readonly nameLabel: string;
  readonly tapToEdit: string;
  readonly pressEnterToSave: string;
  readonly clickToRename: string;
  readonly requiredField: string;
}

/**
 * Premium hero name input — large font, hairline underline,
 * pencil icon affordance, hover/focus state transitions.
 * Mirrors the price-list NameField pattern.
 */
export function RecipeNameField({
  value,
  onChange,
  placeholder,
  disabled,
  error,
  labels,
  maxLength = 100,
}: {
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly placeholder: string;
  readonly disabled?: boolean;
  readonly error?: string;
  readonly labels: RecipeNameFieldLabels;
  readonly maxLength?: number;
}) {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const labelTone = focus ? "text-primary" : "text-muted-foreground";
  const dotTone = focus ? "bg-primary" : "bg-muted-foreground";
  const underline = getUnderline(focus, hover, !!error);
  const pencilTone = getPencilTone(focus, hover);
  const helperText = getHelperText(error, focus, value, labels);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => !disabled && inputRef.current?.focus()}
      className={cn("relative", disabled ? "cursor-default" : "cursor-text")}
    >
      <div
        className={cn(
          "mb-0.5 flex items-center gap-1 text-[0.5625rem] font-bold tracking-[0.16em] uppercase transition-colors",
          labelTone,
        )}
      >
        <span
          className={cn("size-0.5 rounded-sm transition-colors", dotTone)}
        />
        {labels.nameLabel}
        <span className="text-muted-foreground/60 font-semibold">·</span>
        <span className="text-muted-foreground text-[0.5625rem] font-medium tracking-normal normal-case">
          {disabled ? "" : labels.tapToEdit}
        </span>
      </div>

      <div
        className={cn(
          "flex items-end gap-2 pb-1 transition-[border-color]",
          underline,
        )}
      >
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          aria-invalid={!!error}
          lang="th"
          className={cn(
            "min-w-0 flex-1 border-0 bg-transparent p-0 outline-none",
            "text-lg leading-tight font-semibold tracking-tight md:text-xl lg:text-2xl",
            value ? "text-foreground" : "text-muted-foreground/60 italic",
          )}
        />
        {!disabled && (
          <span
            className={cn(
              "mb-0.5 flex size-6 flex-shrink-0 items-center justify-center rounded-full transition-all",
              pencilTone,
            )}
          >
            <Pencil className="size-2.5" />
          </span>
        )}
      </div>

      <div className="mt-1 flex items-center justify-between text-[0.625rem]">
        <span
          className={cn(
            "font-medium",
            focus ? "text-primary" : "text-muted-foreground",
          )}
        >
          {helperText}
        </span>
        <span className="text-muted-foreground/70 text-[0.5625rem]">
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}

function getUnderline(focus: boolean, hover: boolean, hasError: boolean) {
  if (hasError) return "border-b-2 border-destructive";
  if (focus) return "border-b-2 border-primary";
  if (hover) return "border-b-[1.5px] border-foreground";
  return "border-b border-border";
}

function getPencilTone(focus: boolean, hover: boolean) {
  if (focus) return "bg-primary text-primary-foreground";
  if (hover) return "bg-foreground text-background";
  return "border border-border bg-transparent text-muted-foreground";
}

function getHelperText(
  error: string | undefined,
  focus: boolean,
  value: string,
  labels: RecipeNameFieldLabels,
): React.ReactNode {
  if (error) return <span className="text-destructive">{error}</span>;
  if (focus) return labels.pressEnterToSave;
  if (value) return labels.clickToRename;
  return labels.requiredField;
}
