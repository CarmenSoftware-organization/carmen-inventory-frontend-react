import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ADJUSTMENT_TYPE, type AdjustmentType } from "@/types/adjustment-type";

interface AdjustmentTypeCardProps {
  readonly item: AdjustmentType;
  readonly index?: number;
  readonly onEdit: (item: AdjustmentType) => void;
}

export default function AdjustmentTypeCard({
  item,
  index,
  onEdit,
}: AdjustmentTypeCardProps) {
  const tfl = useTranslations("field");

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
      className="hover:border-primary/30 focus-visible:ring-ring cursor-pointer gap-0 py-0 transition-all hover:shadow-md focus-visible:ring-2"
    >
      <CardHeader className="px-4 py-3">
        <div className="flex items-start gap-2">
          {typeof index === "number" && (
            <span className="bg-muted text-muted-foreground mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-sm">{item.name || "..."}</CardTitle>
            <p className="text-muted-foreground text-xs">{item.code}</p>
          </div>
        </div>
        <CardAction className="flex items-center gap-1.5">
          <Badge
            size="sm"
            className="text-xs"
            variant={
              item.type === ADJUSTMENT_TYPE.STOCK_IN ? "default" : "warning"
            }
          >
            {item.type === ADJUSTMENT_TYPE.STOCK_IN
              ? tfl("stockIn")
              : tfl("stockOut")}
          </Badge>
          <Badge
            variant={item.is_active ? "success" : "destructive"}
            size="sm"
            className="text-xs"
          >
            {item.is_active ? "Active" : "Inactive"}
          </Badge>
        </CardAction>
      </CardHeader>

      {item.description && (
        <>
          <Separator />
          <CardContent className="px-4 py-3">
            <p className="text-muted-foreground line-clamp-2 text-xs">
              {item.description}
            </p>
          </CardContent>
        </>
      )}
    </Card>
  );
}
