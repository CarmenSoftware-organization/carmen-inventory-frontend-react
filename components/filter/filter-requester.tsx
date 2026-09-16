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
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import type { User } from "@/types/workflows";

function getUserFullName(user: User) {
  return [user.firstname, user.middlename, user.lastname]
    .filter(Boolean)
    .join(" ");
}

interface FilterRequesterProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
  /**
   * ชื่อคอลัมน์จริงใน DB ที่ clause จะชี้ — default `requestor_id` (สะกดตาม
   * schema ฝั่ง backend ไม่ใช่ requester) — PO ใช้ `created_by_id` กรองผู้จัดซื้อ
   */
  readonly fieldKey?: string;
  readonly label?: string;
}

export function FilterRequester({
  value,
  onChange,
  className,
  fieldKey = "requestor_id",
  label,
}: FilterRequesterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inline = useContext(FilterInlineContext);
  // inline (submenu ของ ListFilterMenu) ไม่มีจังหวะ "เปิด popover" — fetch เลย
  // ทะเบียนผู้ใช้คือทั้ง BU ก้อนใหญ่ที่สุดในหน้า list เลยไม่ลากมาจนกว่าคนจะเปิดจริง
  // (ปุ่มยังพูดค่าที่เลือกได้ด้วย fallback "<label> (N)" ข้างล่าง)
  const { data } = useUser({ perpage: -1 }, { enabled: open || inline });
  const tc = useTranslations("common");
  const tfl = useTranslations("field");

  const users = data?.data ?? [];

  const filteredUsers = (() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter((u) => getUserFullName(u).toLowerCase().includes(q));
  })();

  const displayLabel = label || tfl("requester");

  // Parse filter value (format: "<fieldKey>|string:id1,id2,id3")
  const selectedIds = (() => {
    if (!value) return new Set<string>();
    const prefix = `${fieldKey}|string:`;
    if (!value.startsWith(prefix)) return new Set<string>();
    return new Set(value.slice(prefix.length).split(","));
  })();

  const handleToggle = (userId: string) => {
    const newIds = new Set(selectedIds);
    if (newIds.has(userId)) {
      newIds.delete(userId);
    } else {
      newIds.add(userId);
    }

    if (newIds.size === 0) {
      onChange("");
    } else {
      onChange(`${fieldKey}|string:${Array.from(newIds).join(",")}`);
    }
  };

  const selectedCount = selectedIds.size;

  // ปุ่มพูดค่าที่เลือก — "ชื่อคนแรก +N" อ่านออกทันทีว่ากรองอะไรอยู่
  const firstUser = users.find((u) => selectedIds.has(u.user_id));
  const firstName = firstUser ? getUserFullName(firstUser) : undefined;
  const valueText =
    selectedCount > 0
      ? `${firstName ?? `${displayLabel} (${selectedCount})`}${
          firstName && selectedCount > 1 ? ` +${selectedCount - 1}` : ""
        }`
      : displayLabel;

  const list = (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder={displayLabel}
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
        {filteredUsers.map((user) => (
          <label
            key={user.user_id}
            className={cn(
              "relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs select-none",
              "hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Checkbox
              checked={selectedIds.has(user.user_id)}
              onCheckedChange={() => handleToggle(user.user_id)}
            />
            <span className="truncate">{getUserFullName(user)}</span>
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
