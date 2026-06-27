
import { useTranslations } from "use-intl";
import { useState } from "react";
import { ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useConfigLocation } from "@/hooks/use-location";
import { INVENTORY_TYPE } from "@/constant/location";
import { cn } from "@/lib/utils";

interface SrFilterFromLocationProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

const FIELD_PREFIX = "from_location_id|string:";
const ALLOWED_TYPES: INVENTORY_TYPE[] = [
  INVENTORY_TYPE.INVENTORY,
  INVENTORY_TYPE.CONSIGNMENT,
];

const TYPE_VARIANT: Record<string, "info" | "warning" | "secondary"> = {
  inventory: "info",
  direct: "warning",
  consignment: "secondary",
};

/**
 * Popover filter เลือก from location หลายรายการของหน้า SR
 * แสดงเฉพาะ location ที่ active และมี location_type เป็น inventory หรือ consignment
 * สร้าง filter string รูปแบบ "from_location_id|string:id1,id2"
 *
 * @param props - value ปัจจุบัน, onChange handler และ className
 * @param props.value - filter string ปัจจุบัน
 * @param props.onChange - callback เมื่อเลือก location
 * @param props.className - className เพิ่มเติมของ trigger
 * @returns คอมโพเนนต์ popover filter
 * @example
 * <SrFilterFromLocation value={fromLocation} onChange={setFromLocation} />
 */
export function SrFilterFromLocation({
  value,
  onChange,
  className,
}: SrFilterFromLocationProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const tfl = useTranslations("field");
  const tc = useTranslations("common");

  const { data, isLoading } = useConfigLocation(
    { perpage: -1 },
    { enabled: open },
  );

  const locations = (data?.data ?? []).filter(
    (l) => l.is_active && ALLOWED_TYPES.includes(l.location_type),
  );

  const filteredLocations = !search.trim()
    ? locations
    : (() => {
        const q = search.trim().toLowerCase();
        return locations.filter(
          (l) =>
            l.code.toLowerCase().includes(q) || l.name.toLowerCase().includes(q),
        );
      })();

  const selectedIds = !value?.startsWith(FIELD_PREFIX)
    ? new Set<string>()
    : new Set(value.slice(FIELD_PREFIX.length).split(",").filter(Boolean));

  const handleToggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    if (next.size === 0) {
      onChange("");
    } else {
      onChange(`${FIELD_PREFIX}${Array.from(next).join(",")}`);
    }
  };

  const selectedCount = selectedIds.size;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
      modal
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("justify-between gap-1 text-xs font-normal", className)}
        >
          <span className="truncate text-xs">
            {tfl("fromLocation")}
            {selectedCount > 0 && (
              <Badge
                variant="secondary"
                size="xs"
                className="ml-1 tabular-nums"
              >
                {selectedCount}
              </Badge>
            )}
          </span>
          <ChevronsUpDown className="size-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-64 p-0" align="start">
        <div className="border-b p-2">
          <div className="relative">
            <Search
              className="text-muted-foreground absolute top-1/2 left-2 size-3 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tc("search")}
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>
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
          {isLoading && (
            <div className="text-muted-foreground px-2 py-1.5 text-xs">
              {tc("loading")}
            </div>
          )}
          {!isLoading && filteredLocations.length === 0 && (
            <div className="text-muted-foreground px-2 py-1.5 text-xs">
              {tc("noOptions")}
            </div>
          )}
          {filteredLocations.map((loc) => (
            <label
              key={loc.id}
              className={cn(
                "relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs select-none whitespace-nowrap",
                "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Checkbox
                checked={selectedIds.has(loc.id)}
                onCheckedChange={() => handleToggle(loc.id)}
              />
              <Badge size="xs" variant="secondary" className="shrink-0">
                {loc.code}
              </Badge>
              <span className="flex-1">{loc.name}</span>
              <Badge
                size="xs"
                variant={TYPE_VARIANT[loc.location_type]}
                className="h-4 min-w-0 shrink-0 px-1.5 text-[0.625rem] uppercase"
              >
                {loc.location_type}
              </Badge>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
