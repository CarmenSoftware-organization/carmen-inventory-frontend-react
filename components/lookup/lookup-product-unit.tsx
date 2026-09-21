import { useEffect, useRef } from "react";
import { useTranslations } from "use-intl";
import { Loader2 } from "lucide-react";
import { useProductUnits, type ProductUnit } from "@/hooks/use-product-units";
import { cn } from "@/lib/utils";
import { FieldPlainText } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LookupProductUnitProps {
  readonly productId: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onItemChange?: (unit: ProductUnit) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly error?: string;
  readonly readOnly?: boolean;
}

export function LookupProductUnit({
  productId,
  value,
  onValueChange,
  onItemChange,
  disabled,
  placeholder,
  className,
  error,
  readOnly,
}: LookupProductUnitProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const { data: units = [], isLoading } = useProductUnits(
    productId || undefined,
  );

  const onValueChangeRef = useRef(onValueChange);
  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  });
  useEffect(() => {
    if (units.length === 0) return;
    const hasMatch = units.some((u) => u.id === value);
    if (value && hasMatch) return;
    onValueChangeRef.current(units[0].id);
  }, [units, value]);

  if (readOnly) {
    const selected = units.find((u) => u.id === value);
    return (
      <FieldPlainText className={className}>{selected?.name}</FieldPlainText>
    );
  }

  return (
    <Select
      value={value || undefined}
      onValueChange={(id) => {
        onValueChange(id);
        const unit = units.find((u) => u.id === id);
        if (unit) onItemChange?.(unit);
      }}
      disabled={disabled || isLoading}
    >
      <SelectTrigger
        size="sm"
        align="end"
        aria-invalid={!!error}
        className={cn("text-xs", className)}
      >
        {isLoading ? (
          <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
        ) : (
          <SelectValue
            placeholder={placeholder ?? tl("select", { entity: tfl("unit") })}
          />
        )}
      </SelectTrigger>
      <SelectContent>
        {units.map((unit) => (
          <SelectItem
            key={unit.id}
            value={unit.id}
            className="text-right text-xs"
          >
            {unit.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
