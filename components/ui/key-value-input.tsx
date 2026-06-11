
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createKeyValueRow, type KeyValueRow } from "@/lib/form-helpers";

interface KeyValueInputProps {
  readonly value: KeyValueRow[];
  readonly onChange: (value: KeyValueRow[]) => void;
  readonly disabled?: boolean;
  readonly keyPlaceholder?: string;
  readonly valuePlaceholder?: string;
}

export function KeyValueInput({
  value,
  onChange,
  disabled,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
}: KeyValueInputProps) {
  const handleAdd = () => {
    onChange([...value, createKeyValueRow()]);
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleChange = (
    index: number,
    field: "key" | "value",
    newVal: string,
  ) => {
    const updated = value.map((row, i) =>
      i === index ? { ...row, [field]: newVal } : row,
    );
    onChange(updated);
  };

  if (disabled && value.length === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  return (
    <div className="space-y-1.5">
      {value.length > 0 && (
        <div className="flex items-center gap-1.5 px-0.5">
          <span className="text-muted-foreground flex-1 text-xs">
            {keyPlaceholder}
          </span>
          <span className="text-muted-foreground flex-1 text-xs">
            {valuePlaceholder}
          </span>
          {!disabled && <span className="w-6" />}
        </div>
      )}

      {value.map((row, index) => (
        <div key={row._id} className="flex items-center gap-1.5">
          <Input
            placeholder={keyPlaceholder}
            className="h-7 text-xs"
            value={row.key}
            onChange={(e) => handleChange(index, "key", e.target.value)}
            disabled={disabled}
            maxLength={50}
            aria-label={`${keyPlaceholder} ${index + 1}`}
          />
          <Input
            placeholder={valuePlaceholder}
            className="h-7 text-xs"
            value={row.value}
            onChange={(e) => handleChange(index, "value", e.target.value)}
            disabled={disabled}
            maxLength={100}
            aria-label={`${valuePlaceholder} ${index + 1}`}
          />
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Remove row"
              onClick={() => handleRemove(index)}
            >
              <X />
            </Button>
          )}
        </div>
      ))}

      {!disabled && (
        <Button type="button" variant="outline" size="xs" onClick={handleAdd}>
          <Plus aria-hidden="true" />
          Add
        </Button>
      )}
    </div>
  );
}
