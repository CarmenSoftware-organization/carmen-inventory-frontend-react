
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const VALIDITY_PRESETS = [7, 14, 30, 60, 90] as const;

interface PltValidityStepperProps {
  readonly value: number | null;
  readonly onChange: (v: number | null) => void;
  readonly disabled?: boolean;
  readonly labels: {
    readonly label: string;
    readonly hint: string;
    readonly daySingular: string;
    readonly dayPlural: string;
    readonly presets: string;
  };
}

/**
 * Validity period stepper — tile กลางมี input ใหญ่ + ปุ่ม -/+
 * รองรับ preset chips (7/14/30/60/90) ด้านล่าง
 */
export function PltValidityStepper({
  value,
  onChange,
  disabled,
  labels,
}: PltValidityStepperProps) {
  const [focus, setFocus] = useState(false);
  const dec = () => onChange(Math.max(1, (value ?? 1) - 1));
  const inc = () => onChange((value ?? 0) + 1);
  const dayLabel = value === 1 ? labels.daySingular : labels.dayPlural;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-foreground/80 text-[0.625rem] font-semibold tracking-widest uppercase">
          {labels.label}
        </label>
        <span className="text-muted-foreground text-[0.625rem]">
          {labels.hint}
        </span>
      </div>

      <div
        className={cn(
          "bg-background/60 flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors",
          focus ? "border-primary" : "border-border/60",
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          onClick={dec}
          disabled={disabled || !value || value <= 1}
          aria-label="decrease"
          className="size-7 shrink-0 rounded-lg"
        >
          <Minus />
        </Button>
        <div className="flex flex-1 items-baseline justify-center gap-1.5">
          <input
            type="number"
            min={1}
            disabled={disabled}
            value={value ?? ""}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              onChange(Number.isNaN(v) ? null : v);
            }}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            placeholder="—"
            className={cn(
              "w-20 border-0 bg-transparent p-0 text-center text-3xl font-semibold tracking-tight tabular-nums outline-none",
              value ? "text-foreground" : "text-muted-foreground/60",
            )}
          />
          <span className="text-muted-foreground text-xs font-semibold">
            {dayLabel}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          onClick={inc}
          disabled={disabled}
          aria-label="increase"
          className="size-7 shrink-0 rounded-lg"
        >
          <Plus />
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground/70 mr-1 text-[0.5625rem] font-semibold tracking-widest uppercase">
          {labels.presets}
        </span>
        {VALIDITY_PRESETS.map((preset) => {
          const on = value === preset;
          return (
            <button
              key={preset}
              type="button"
              disabled={disabled}
              onClick={() => onChange(preset)}
              className={cn(
                "rounded-full border px-2 py-1 text-[0.6875rem] font-semibold transition-colors",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-background/60 text-foreground/80 hover:border-foreground/40",
                disabled && "opacity-50",
              )}
            >
              {preset}d
            </button>
          );
        })}
      </div>
    </div>
  );
}
