import { Globe } from "lucide-react";
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
import { StatusBadge } from "@/components/ui/status-badge";
import {
  CUISINE_REGION_CONFIG,
  CUISINE_REGION_LABEL_KEY,
} from "@/constant/cuisine";
import type { Cuisine } from "@/types/cuisine";

interface CuisineCardProps {
  readonly item: Cuisine;
  readonly index?: number;
  readonly onEdit: (item: Cuisine) => void;
}

/**
 * การ์ดแสดงข้อมูล cuisine สำหรับ grid view
 * @param props - ข้อมูล cuisine, index และ callback แก้ไข
 * @returns React element การ์ด cuisine
 * @example
 * <CuisineCard item={cuisine} index={0} onEdit={setSelected} />
 */
export default function CuisineCard({ item, index, onEdit }: CuisineCardProps) {
  const t = useTranslations("operationPlan.cuisine");
  const regionConfig = CUISINE_REGION_CONFIG[item.region];

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
          <CardTitle className="text-sm flex-1 min-w-0 break-words leading-tight">
            {item.name || "..."}
          </CardTitle>
        </div>
        <CardAction>
          <StatusBadge active={item.is_active} />
        </CardAction>
      </CardHeader>

      {item.region && (
        <>
          <Separator />
          <CardContent className="flex items-center gap-1.5 px-4 py-2 text-xs">
            <Globe
              className="text-muted-foreground size-3 shrink-0"
              aria-hidden="true"
            />
            {regionConfig ? (
              <Badge size="xs" className={`${regionConfig.className} text-xs`}>
                {t(CUISINE_REGION_LABEL_KEY[item.region])}
              </Badge>
            ) : (
              <span className="text-muted-foreground truncate">
                {item.region}
              </span>
            )}
          </CardContent>
        </>
      )}
    </Card>
  );
}
