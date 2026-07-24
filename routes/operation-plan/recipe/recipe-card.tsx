import { Clock, ChefHat, Tag } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import type { Recipe } from "@/types/recipe";
import type { Cuisine } from "@/types/cuisine";
import type { RecipeCategory } from "@/types/recipe-category";

const DIFFICULTY_VARIANT: Record<string, "success" | "warning" | "destructive"> = {
  EASY: "success",
  MEDIUM: "warning",
  HARD: "destructive",
};

interface RecipeCardProps {
  readonly item: Recipe;
  readonly index?: number;
  readonly cuisines: Cuisine[];
  readonly categories: RecipeCategory[];
  readonly onEdit: (item: Recipe) => void;
}

/**
 * การ์ดแสดงข้อมูลสูตรอาหารสำหรับ grid view บนมือถือและเดสก์ท็อป
 * @param props - ข้อมูลสูตรอาหาร, index, cuisines, categories และ callback แก้ไข
 * @returns React element การ์ดสูตรอาหาร
 * @example
 * <RecipeCard
 *   item={recipe}
 *   index={0}
 *   cuisines={cuisines}
 *   categories={categories}
 *   onEdit={(r) => navigate(`/operation-plan/recipe/${r.id}`)}
 * />
 */
export default function RecipeCard({ item, index, cuisines, categories, onEdit }: RecipeCardProps) {
  const t = useTranslations("operationPlan.recipe");
  const ts = useTranslations("status");
  const tfl = useTranslations("field");
  const { dateTimeFormat } = useProfile();
  const cuisineName = cuisines.find((c) => c.id === item.cuisine_id)?.name;
  const categoryName = categories.find((c) => c.id === item.category_id)?.name;
  const totalTime = (item.prep_time ?? 0) + (item.cook_time ?? 0);

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
        <CardAction className="flex flex-col items-end gap-1">
          {item.difficulty && (
            <Badge
              variant={DIFFICULTY_VARIANT[item.difficulty] ?? "secondary"}
              size="xs"
              className="text-xs"
            >
              {item.difficulty}
            </Badge>
          )}
          {!item.is_active && (
            <Badge variant="secondary" size="xs" className="text-xs">
              {ts("inactive")}
            </Badge>
          )}
        </CardAction>
      </CardHeader>

      <Separator />

      <CardContent className="space-y-1.5 px-4 py-3 text-xs">
        {cuisineName && (
          <div className="flex items-center gap-1.5">
            <ChefHat
              className="text-muted-foreground size-3 shrink-0"
              aria-hidden="true"
            />
            <span className="font-semibold truncate">{cuisineName}</span>
          </div>
        )}
        {categoryName && (
          <div className="flex items-center gap-1.5">
            <Tag
              className="text-muted-foreground size-3 shrink-0"
              aria-hidden="true"
            />
            <span className="text-muted-foreground truncate">
              {categoryName}
            </span>
          </div>
        )}
        {totalTime > 0 && (
          <div className="flex items-center gap-1.5">
            <Clock
              className="text-muted-foreground size-3 shrink-0"
              aria-hidden="true"
            />
            <span className="text-muted-foreground">
              {totalTime} {t("minShort")}
            </span>
          </div>
        )}
        {item.audit?.updated?.at && (
          <div className="flex items-center gap-1.5">
            <Clock
              className="text-muted-foreground size-3 shrink-0"
              aria-hidden="true"
            />
            <span className="text-muted-foreground truncate">
              {tfl("updated")}: {formatDate(item.audit.updated.at, dateTimeFormat)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
