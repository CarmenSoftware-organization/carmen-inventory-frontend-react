import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";
import { useShelf } from "@/hooks/use-shelf";
import type { Shelf } from "@/types/shelf";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** ค่า sentinel ของตัวเลือก "ไม่ระบุชั้นวาง" — Radix Select ห้าม value ว่าง */
const NONE = "__none__";

interface LookupShelfProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onItemChange?: (shelf: Shelf) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly readOnly?: boolean;
}

export function LookupShelf({
  value,
  onValueChange,
  onItemChange,
  disabled,
  placeholder,
  className,
  readOnly,
}: LookupShelfProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");

  const { data } = useShelf({
    perpage: -1,
  });

  const shelves = (data?.data ?? []).filter((s) => s.is_active);
  const selected = (data?.data ?? []).find((s) => s.id === value);

  if (readOnly) {
    return <span className="px-2 text-xs">{selected?.name}</span>;
  }

  return (
    <Select
      value={value || undefined}
      onValueChange={(v) => {
        if (v === NONE) {
          onValueChange("");
          return;
        }
        onValueChange(v);
        const shelf = shelves.find((s) => s.id === v);
        if (shelf) onItemChange?.(shelf);
      }}
      disabled={disabled}
    >
      <SelectTrigger size="sm" className={cn("w-full text-xs", className)}>
        <SelectValue
          placeholder={placeholder ?? tl("select", { entity: tfl("shelf") })}
        >
          {selected?.name}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>—</SelectItem>
        {shelves.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
