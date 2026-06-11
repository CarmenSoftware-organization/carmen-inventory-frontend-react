
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
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import type { User } from "@/types/workflows";

/**
 * รวมชื่อเต็มของ user
 *
 * Concatenate `firstname`, `middlename`, `lastname` คั่นด้วย space กรอง
 * ช่องว่างออกใช้สำหรับแสดงและ filter ใน `FilterRequester`
 *
 * @param user - ข้อมูล user object
 * @returns string ชื่อเต็มของ user
 * @example
 * ```ts
 * getUserFullName({ firstname: "John", lastname: "Doe" }); // "John Doe"
 * ```
 */
function getUserFullName(user: User) {
  return [user.firstname, user.middlename, user.lastname]
    .filter(Boolean)
    .join(" ");
}

interface FilterRequesterProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

/**
 * ตัวกรองผู้ขอ (requester) แบบ multi-select
 *
 * Render Popover button + Command พร้อม search input และรายการ user fetch
 * ข้อมูลจาก `useUser` แสดงชื่อเต็มผ่าน `getUserFullName` parse/serialize
 * URL filter รูปแบบ `requester_id|string:id1,id2`
 *
 * @param props - props ของ filter
 * @param props.value - URL filter string ปัจจุบัน
 * @param props.onChange - callback เปลี่ยนค่า filter
 * @param props.className - className เพิ่มเติม
 * @returns JSX element ของ filter popover
 * @example
 * ```tsx
 * <FilterRequester value={extraFilter} onChange={setExtraFilter} />
 * ```
 */
export function FilterRequester({
  value,
  onChange,
  className,
}: FilterRequesterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data } = useUser({ perpage: -1 });
  const tc = useTranslations("common");
  const tfl = useTranslations("field");

  const users = data?.data ?? [];

  const filteredUsers = (() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter((u) => getUserFullName(u).toLowerCase().includes(q));
  })();

  // Parse filter value (format: "requester_id|string:id1,id2,id3")
  const selectedIds = (() => {
    if (!value) return new Set<string>();
    const match = /requester_id\|string:(.+)/.exec(value);
    if (!match) return new Set<string>();
    return new Set(match[1].split(","));
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
      onChange(`requester_id|string:${Array.from(newIds).join(",")}`);
    }
  };

  const selectedCount = selectedIds.size;

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
            {selectedCount > 0
              ? `${tfl("requester")} (${selectedCount})`
              : tfl("requester")}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={tfl("requester")}
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
      </PopoverContent>
    </Popover>
  );
}
