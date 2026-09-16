import { Badge } from "@/components/ui/badge";
import { ModuleTileIcon } from "@/components/ui/module-tile";

interface DocumentListHeaderProps {
  readonly title: string;
  readonly description: string;
  readonly count?: number;
}

/**
 * หัวหน้า list ของทุกโมดูล — icon ของ module + title + จำนวนรายการ + คำอธิบาย
 *
 * เป็นจุดเดียวที่คุมหน้าตาหัวหน้า list ทั้งแอป อย่า render icon/h1/badge เองในหน้าใหม่
 */
export function DocumentListHeader({
  title,
  description,
  count,
}: DocumentListHeaderProps) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <ModuleTileIcon />
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {count !== undefined && count > 0 && (
          <Badge variant="secondary" size="sm" className="text-xs tabular-nums">
            {count.toLocaleString()}
          </Badge>
        )}
      </div>
      <p className="text-muted-foreground text-xs sm:text-sm">{description}</p>
    </div>
  );
}
