import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Sentinel ที่ใช้แทน "All Types" — radix Select ห้าม value เป็น "" */
const ALL_VALUE = "__all__";

interface ReportGroupFilterProps {
  /** เก็บเป็น array เพื่อ backward-compat กับ caller (single-select → 0 หรือ 1 item) */
  readonly value: string[];
  readonly onChange: (value: string[]) => void;
  readonly groups: string[];
  readonly allTypesLabel: string;
  readonly noTypesFoundLabel: string;
}

/**
 * Single-select dropdown สำหรับกรอง report ตาม group
 *
 * เลือก "All Types" → clear filter, เลือก group → กรองเฉพาะ group นั้น
 */
export function ReportGroupFilter({
  value,
  onChange,
  groups,
  allTypesLabel,
  noTypesFoundLabel,
}: ReportGroupFilterProps) {
  const current = value[0] ?? ALL_VALUE;
  const hasGroups = groups.length > 0;

  return (
    <Select
      value={current}
      onValueChange={(v) => onChange(v === ALL_VALUE ? [] : [v])}
    >
      <SelectTrigger
        size="sm"
        className="bg-background max-w-xs min-w-40 text-xs"
        aria-label={allTypesLabel}
      >
        <SelectValue placeholder={allTypesLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE} className="text-xs">
          {allTypesLabel}
        </SelectItem>
        {hasGroups ? (
          groups.map((g) => (
            <SelectItem key={g} value={g} className="text-xs">
              {g}
            </SelectItem>
          ))
        ) : (
          <div className="text-muted-foreground px-2 py-1.5 text-xs">
            {noTypesFoundLabel}
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
