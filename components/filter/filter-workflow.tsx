
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
import { useWorkflowTypeQuery } from "@/hooks/use-workflow";
import { type WORKFLOW_TYPE } from "@/types/workflows";
import { cn } from "@/lib/utils";

interface FilterWorkflowProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly workflowType: WORKFLOW_TYPE;
  readonly className?: string;
}

/**
 * ตัวกรอง workflow แบบ multi-select
 *
 * Render Popover + Command + search + checkbox ของ workflows ที่ดึงผ่าน
 * `useWorkflowTypeQuery(workflowType)` parse/serialize URL filter รูปแบบ
 * `workflow_id|string:id1,id2`
 *
 * @param props - props ของ filter
 * @param props.value - URL filter string ปัจจุบัน
 * @param props.onChange - callback เปลี่ยนค่า filter
 * @param props.workflowType - ประเภท workflow ที่จะ filter
 * @param props.className - className เพิ่มเติม
 * @returns JSX element ของ filter popover
 * @example
 * ```tsx
 * <FilterWorkflow
 *   value={extraFilter}
 *   onChange={setExtraFilter}
 *   workflowType="purchase_request"
 * />
 * ```
 */
export function FilterWorkflow({
  value,
  onChange,
  workflowType,
  className,
}: FilterWorkflowProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: workflows } = useWorkflowTypeQuery(workflowType);
  const tfl = useTranslations("field");

  const filteredWorkflows = (() => {
    const list = workflows ?? [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((w) => w.name.toLowerCase().includes(q));
  })();

  // Parse filter value (format: "workflow_id|string:id1,id2,id3")
  const selectedIds = (() => {
    if (!value) return new Set<string>();
    const match = /workflow_id\|string:(.+)/.exec(value);
    if (!match) return new Set<string>();
    return new Set(match[1].split(","));
  })();

  const handleToggle = (workflowId: string) => {
    const newIds = new Set(selectedIds);
    if (newIds.has(workflowId)) {
      newIds.delete(workflowId);
    } else {
      newIds.add(workflowId);
    }

    if (newIds.size === 0) {
      onChange("");
    } else {
      onChange(`workflow_id|string:${Array.from(newIds).join(",")}`);
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
              ? `${tfl("workflow")} (${selectedCount})`
              : tfl("workflow")}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={tfl("workflow")}
            className="placeholder:text-xs"
            value={search}
            onValueChange={setSearch}
          />
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredWorkflows.map((wf) => (
              <label
                key={wf.id}
                className={cn(
                  "relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs select-none",
                  "hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Checkbox
                  checked={selectedIds.has(wf.id)}
                  onCheckedChange={() => handleToggle(wf.id)}
                />
                <span className="truncate">{wf.name}</span>
              </label>
            ))}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
