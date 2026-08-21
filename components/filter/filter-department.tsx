import { useTranslations } from "use-intl";
import { useContext, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandInput } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { FilterInlineContext } from "@/components/ui/filter-inline-context";
import { useDepartment } from "@/hooks/use-department";
import { cn } from "@/lib/utils";

interface FilterDepartmentProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

/**
 * ตัวกรองแผนก (department) แบบ multi-select
 *
 * Render Popover trigger button (label + count) เปิด Command พร้อม search
 * input และรายการ checkbox ของแผนก fetch ข้อมูลจาก `useDepartment` เฉพาะ
 * เมื่อ popover เปิด (lazy) และกรองเฉพาะ active parse/serialize URL filter
 * รูปแบบ `department_id|string:id1,id2`
 *
 * @param props - props ของ filter
 * @param props.value - URL filter string ปัจจุบัน
 * @param props.onChange - callback เปลี่ยนค่า filter
 * @param props.className - className เพิ่มเติม
 * @returns JSX element ของ filter popover
 * @example
 * ```tsx
 * <FilterDepartment value={extraFilter} onChange={setExtraFilter} />
 * ```
 */
export function FilterDepartment({
  value,
  onChange,
  className,
}: FilterDepartmentProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inline = useContext(FilterInlineContext);
  // inline (submenu ของ ListFilterMenu) ไม่มีจังหวะ "เปิด popover" — fetch เลย
  const { data } = useDepartment({ perpage: -1 }, { enabled: open || inline });
  const tc = useTranslations("common");
  const tfl = useTranslations("field");

  const departments = data?.data?.filter((d) => d.is_active) ?? [];

  const filteredDepartments = (() => {
    if (!search) return departments;
    const q = search.toLowerCase();
    return departments.filter((d) => d.name.toLowerCase().includes(q));
  })();

  // Parse filter value (format: "department_id|string:id1,id2,id3")
  const selectedIds = (() => {
    if (!value) return new Set<string>();
    const match = /department_id\|string:(.+)/.exec(value);
    if (!match) return new Set<string>();
    return new Set(match[1].split(","));
  })();

  const handleToggle = (departmentId: string) => {
    const newIds = new Set(selectedIds);
    if (newIds.has(departmentId)) {
      newIds.delete(departmentId);
    } else {
      newIds.add(departmentId);
    }

    if (newIds.size === 0) {
      onChange("");
    } else {
      onChange(`department_id|string:${Array.from(newIds).join(",")}`);
    }
  };

  const selectedCount = selectedIds.size;

  // ปุ่มพูดค่าที่เลือก — "ชื่อแผนกแรก +N" อ่านออกทันทีว่ากรองอะไรอยู่
  // (รายชื่อแผนก fetch ตอนเปิด popover เท่านั้น — ยังไม่มีข้อมูล เช่นเปิดจาก
  // deep link/saved view โดยไม่เคยเปิด popover ให้ถอยไปแบบ "แผนก (N)")
  const firstName = departments.find((d) => selectedIds.has(d.id))?.name;
  const valueText =
    selectedCount > 0
      ? `${firstName ?? `${tfl("department")} (${selectedCount})`}${
          firstName && selectedCount > 1 ? ` +${selectedCount - 1}` : ""
        }`
      : tfl("department");

  const list = (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder={tfl("department")}
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
          <span className="truncate">{tc("all")}</span>
        </label>
        {filteredDepartments.map((dept) => (
          <label
            key={dept.id}
            className={cn(
              "relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs select-none",
              "hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Checkbox
              checked={selectedIds.has(dept.id)}
              onCheckedChange={() => handleToggle(dept.id)}
            />
            <span className="truncate">{dept.name}</span>
          </label>
        ))}
      </div>
    </Command>
  );

  // ใน submenu ของ ListFilterMenu — โชว์รายการตรง ๆ ไม่ต้องมีปุ่ม trigger ซ้อน
  if (inline) {
    return list;
  }

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
          <span
            className={cn(
              "truncate",
              !selectedCount && "text-muted-foreground text-xs",
            )}
          >
            {valueText}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        {list}
      </PopoverContent>
    </Popover>
  );
}
