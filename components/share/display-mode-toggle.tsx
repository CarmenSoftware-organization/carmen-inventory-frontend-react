import { LayoutGrid, LayoutList } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DisplayMode = "list" | "grid";

interface DisplayModeToggleProps {
  readonly value: DisplayMode;
  readonly onChange: (mode: DisplayMode) => void;
  readonly className?: string;
}

/**
 * ปุ่มคู่สลับมุมมองตาราง/การ์ดของหน้า list — ที่เดียวที่วาดคู่นี้ทั้งแอป
 * (เคยถูกก๊อปไว้ใน ConfigListTemplate, ListToolbar และอีก 9 หน้า)
 * คนละเรื่องกับ `ViewModeToggle` ซึ่งสลับ my-pending / all-documents
 */
export function DisplayModeToggle({
  value,
  onChange,
  className,
}: DisplayModeToggleProps) {
  const tc = useTranslations("common");
  return (
    <div className={cn("flex items-center rounded-md border", className)}>
      <Button
        size="icon-sm"
        variant={value === "list" ? "secondary" : "ghost"}
        onClick={() => onChange("list")}
        aria-label={tc("aria.listView")}
        aria-pressed={value === "list"}
      >
        <LayoutList className="size-4" />
      </Button>
      <Button
        size="icon-sm"
        variant={value === "grid" ? "secondary" : "ghost"}
        onClick={() => onChange("grid")}
        aria-label={tc("aria.gridView")}
        aria-pressed={value === "grid"}
      >
        <LayoutGrid className="size-4" />
      </Button>
    </div>
  );
}
