import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import {
  InputSuffixAddon,
  InputSuffixField,
  InputSuffixInput,
} from "@/components/ui/input/input-suffix";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";

interface FilterAmountRangeProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly fieldKey: string;
  readonly className?: string;
}

export function FilterAmountRange({
  value,
  onChange,
  fieldKey,
  className,
}: FilterAmountRangeProps) {
  const tc = useTranslations("common");
  const { defaultCurrencyCode } = useProfile();

  const parsed = (() => {
    const match = new RegExp(String.raw`${fieldKey}\|num_range:([^,]*),(.*)$`).exec(
      value,
    );
    return { min: match?.[1] ?? "", max: match?.[2] ?? "" };
  })();

  // ค่าใน input เป็น local ระหว่างพิมพ์ — sync กลับเมื่อค่าจริงเปลี่ยนจากที่อื่น
  // (chip X / Clear All / saved view)
  const [min, setMin] = useState(parsed.min);
  const [max, setMax] = useState(parsed.max);
  useEffect(() => {
    setMin(parsed.min);
    setMax(parsed.max);
    // sync เฉพาะเมื่อค่าจริงจาก URL เปลี่ยน ไม่ผูกกับ state ระหว่างพิมพ์
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed.min, parsed.max]);

  const commit = (nextMin: string, nextMax: string) => {
    const a = nextMin.trim();
    const b = nextMax.trim();
    onChange(a === "" && b === "" ? "" : `${fieldKey}|num_range:${a},${b}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commit(min, max);
  };

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {/* สองกล่องหน้าตาเดียวกัน (ค่า + currency ของ BU) — ใส่ฝั่งเดียวก็ได้
          เปิดปลายอีกฝั่ง จึงต้องอ่านออกทั้งคู่ว่าหน่วยอะไร · basis-0 ทั้งคู่
          ให้แบ่งครึ่งเท่ากัน */}
      <InputSuffixField className="min-w-0 flex-1 basis-0">
        <InputSuffixInput
          type="number"
          inputMode="decimal"
          placeholder={tc("min")}
          value={min}
          onChange={(e) => setMin(e.target.value)}
          onBlur={() => commit(min, max)}
          onKeyDown={onKeyDown}
          className="tabular-nums"
          aria-label={tc("min")}
        />
        <InputSuffixAddon>
          <span className="text-muted-foreground px-2 text-xs">
            {defaultCurrencyCode}
          </span>
        </InputSuffixAddon>
      </InputSuffixField>
      <span className="text-muted-foreground shrink-0 text-xs">–</span>
      <InputSuffixField className="min-w-0 flex-1 basis-0">
        <InputSuffixInput
          type="number"
          inputMode="decimal"
          placeholder={tc("max")}
          value={max}
          onChange={(e) => setMax(e.target.value)}
          onBlur={() => commit(min, max)}
          onKeyDown={onKeyDown}
          className="tabular-nums"
          aria-label={tc("max")}
        />
        <InputSuffixAddon>
          <span className="text-muted-foreground px-2 text-xs">
            {defaultCurrencyCode}
          </span>
        </InputSuffixAddon>
      </InputSuffixField>
    </div>
  );
}
