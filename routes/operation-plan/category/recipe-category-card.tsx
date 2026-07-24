import { FolderTree, Clock } from "lucide-react";
import { useTranslations } from "use-intl";
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import type { RecipeCategory } from "@/types/recipe-category";

interface RecipeCategoryCardProps {
  readonly item: RecipeCategory;
  readonly index?: number;
  readonly parentName?: string;
  readonly onEdit: (item: RecipeCategory) => void;
}

/**
 * การ์ดแสดงข้อมูลหมวดหมู่สูตรอาหารสำหรับ grid view
 * @param props - ข้อมูลหมวดหมู่, index, parentName และ callback แก้ไข
 * @returns React element การ์ดหมวดหมู่สูตรอาหาร
 * @example
 * <RecipeCategoryCard item={category} index={0} parentName="Main" onEdit={setSelected} />
 */
export default function RecipeCategoryCard({
  item,
  index,
  parentName,
  onEdit,
}: RecipeCategoryCardProps) {
  const tfl = useTranslations("field");
  const { dateTimeFormat } = useProfile();
  const updatedAt = item.audit?.updated?.at;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onEdit(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit(item);
        }
      }}
      className="hover:border-primary/30 focus-visible:ring-ring cursor-pointer gap-0 py-0 transition-colors focus-visible:ring-2"
    >
      <CardHeader className="px-4 py-3">
        <div className="flex items-start gap-2">
          {typeof index === "number" && (
            <span className="bg-muted text-muted-foreground inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm break-words leading-tight">
              {item.name || "..."}
            </CardTitle>
            <p className="text-muted-foreground mt-0.5 text-xs">{item.code}</p>
          </div>
        </div>
        <CardAction>
          <StatusBadge active={item.is_active} />
        </CardAction>
      </CardHeader>

      {(parentName || updatedAt) && (
        <>
          <Separator />
          <CardContent className="space-y-1.5 px-4 py-2 text-xs">
            {parentName && (
              <div className="flex items-center gap-1.5">
                <FolderTree
                  className="text-muted-foreground size-3 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-muted-foreground truncate">
                  {parentName}
                </span>
              </div>
            )}
            {updatedAt && (
              <div className="flex items-center gap-1.5">
                <Clock
                  className="text-muted-foreground size-3 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-muted-foreground truncate">
                  {tfl("updated")}: {formatDate(updatedAt, dateTimeFormat)}
                </span>
              </div>
            )}
          </CardContent>
        </>
      )}
    </Card>
  );
}
