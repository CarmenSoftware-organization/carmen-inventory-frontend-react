
import { useTranslations } from "use-intl";
import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandInput } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface FilterStageProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly stages: string[];
  readonly className?: string;
}

/**
 * ตัวกรอง workflow stage แบบ multi-select
 *
 * Render Popover ที่มี Command + search + checkbox รายการ stage รับ
 * stages array จากภายนอก (เพราะเป็น string ของ workflow แต่ละตัว)
 * parse/serialize URL filter รูปแบบ
 * `workflow_current_stage|string:stage1,stage2`
 *
 * @param props - props ของ filter
 * @param props.value - URL filter string ปัจจุบัน
 * @param props.onChange - callback เปลี่ยนค่า filter
 * @param props.stages - array ของ stage names ที่จะเลือกได้
 * @param props.className - className เพิ่มเติม
 * @returns JSX element ของ filter popover
 * @example
 * ```tsx
 * <FilterStage value={extraFilter} onChange={setExtraFilter} stages={stages} />
 * ```
 */
export function FilterStage({
  value,
  onChange,
  stages,
  className,
}: FilterStageProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const t = useTranslations("procurement.purchaseRequest");

  const filteredStages = (() => {
    if (!search) return stages;
    const q = search.toLowerCase();
    return stages.filter((s) => s.toLowerCase().includes(q));
  })();

  // Parse filter value (format: "workflow_current_stage|string:stage1,stage2")
  const selectedStages = (() => {
    if (!value) return new Set<string>();
    const match = /workflow_current_stage\|string:(.+)/.exec(value);
    if (!match) return new Set<string>();
    return new Set(match[1].split(","));
  })();

  const handleToggle = (stage: string) => {
    const next = new Set(selectedStages);
    if (next.has(stage)) {
      next.delete(stage);
    } else {
      next.add(stage);
    }

    if (next.size === 0) {
      onChange("");
    } else {
      onChange(`workflow_current_stage|string:${Array.from(next).join(",")}`);
    }
  };

  const selectedCount = selectedStages.size;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch("");
      }}
      modal
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("justify-between", className)}
        >
          <span className={cn("truncate", !selectedCount && "text-xs")}>
            {selectedCount > 0
              ? `${t("stage")} (${selectedCount})`
              : t("allStage")}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t("stage")}
            className="placeholder:text-xs"
            value={search}
            onValueChange={setSearch}
          />
          <div className="max-h-60 overflow-y-auto p-1">
            <label
              className={cn(
                "relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs select-none",
                "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Checkbox
                checked={selectedCount === 0}
                onCheckedChange={() => onChange("")}
              />
              <span className="truncate">{t("allStage")}</span>
            </label>
            {filteredStages.map((s) => (
              <label
                key={s}
                className={cn(
                  "relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs select-none",
                  "hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Checkbox
                  checked={selectedStages.has(s)}
                  onCheckedChange={() => handleToggle(s)}
                />
                <span className="truncate">{s}</span>
              </label>
            ))}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
