
import { useTranslations } from "use-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StatusOption {
  value: string;
  label: string;
}

interface Props {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly options?: StatusOption[];
  readonly className?: string;
  readonly defaultLabel?: string;
}

/**
 * Status filter dropdown สำหรับ list page toolbar
 *
 * ใช้ Select ของ shadcn (ไม่ใช่ popover) เหมาะกับตัวกรองที่มี option น้อย
 * Default option คือ active/inactive จาก is_active flag แต่ override ได้
 * ผ่าน prop options (เช่น ใช้ doc_status ของ PR/PO) ค่าว่างในระบบ
 * map เป็น "all" ภายใน Select component
 *
 * @param props - value, onChange, options, placeholder, className, defaultLabel
 * @returns JSX element ของ Select filter
 * @example
 * ```tsx
 * <StatusFilter value={status} onChange={setStatus} />
 * ```
 */
export function StatusFilter({
  value,
  onChange,
  placeholder,
  options,
  className = "text-xs",
  defaultLabel,
}: Props) {
  const ts = useTranslations("status");
  const tfl = useTranslations("field");

  const statusOptions = options ?? [
    { label: ts("active"), value: "is_active|bool:true" },
    { label: ts("inactive"), value: "is_active|bool:false" },
  ];

  return (
    <Select
      value={value || "all"}
      onValueChange={(v) => onChange(v === "all" ? "" : v)}
    >
      <SelectTrigger
        size="sm"
        className={className}
        aria-label={`Filter by ${(placeholder ?? tfl("status")).toLowerCase()}`}
      >
        <SelectValue placeholder={placeholder ?? tfl("status")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{defaultLabel ?? ts("all")}</SelectItem>
        {statusOptions.map((opt) => (
          <SelectItem className="text-xs" key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
