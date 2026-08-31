import { useContext } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "use-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterInlineContext } from "@/components/ui/filter-inline-context";
import { cn } from "@/lib/utils";

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
  const inline = useContext(FilterInlineContext);

  const statusOptions = options ?? [
    { label: ts("active"), value: "is_active|bool:true" },
    { label: ts("inactive"), value: "is_active|bool:false" },
  ];

  // ใน submenu ของ ListFilterMenu — โชว์ตัวเลือกเป็นแถวกดได้เลย ไม่ต้องเปิด
  // Select ซ้อนอีกชั้น (single-select จึงใช้เครื่องหมายถูก ไม่ใช่ checkbox)
  if (inline) {
    const rows = [
      { label: defaultLabel ?? ts("all"), value: "" },
      ...statusOptions,
    ];
    return (
      <div>
        {rows.map((opt) => (
          <button
            key={opt.value || "_all"}
            type="button"
            onClick={() => onChange(opt.value)}
            className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs"
          >
            <Check
              aria-hidden="true"
              className={cn(
                "size-3.5 shrink-0",
                (value || "") !== opt.value && "invisible",
              )}
            />
            <span className="truncate">{opt.label}</span>
          </button>
        ))}
      </div>
    );
  }

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
