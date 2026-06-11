import { CalendarDays, FileText, Users } from "lucide-react";
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
import type { RequestPriceList } from "@/types/request-price-list";

interface RfpCardProps {
  readonly item: RequestPriceList;
  readonly index?: number;
  readonly onEdit: (item: RequestPriceList) => void;
}

/**
 * การ์ดแสดง request price list สำหรับ grid view พร้อมช่วงวันที่และจำนวน vendor
 * @param props - ข้อมูล RFP, index และ callback เมื่อกดแก้ไข
 * @returns React element ของการ์ด RFP
 * @example
 * <RfpCard item={rfp} index={0} onEdit={(r) => router.push(`/vendor-management/request-price-list/${r.id}`)} />
 */
export default function RfpCard({ item, index, onEdit }: RfpCardProps) {
  const tfl = useTranslations("field");
  const { dateFormat } = useProfile();

  const period = (() => {
    const from = formatDate(item.start_date, dateFormat);
    const to = formatDate(item.end_date, dateFormat);
    if (!from && !to) return null;
    return `${from} - ${to}`;
  })();

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
            <span className="bg-muted text-muted-foreground inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <CardTitle className="text-sm flex-1 min-w-0 break-words leading-tight">
            {item.name}
          </CardTitle>
        </div>
        {item.pricelist_template?.name && (
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <FileText className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.pricelist_template.name}</span>
          </p>
        )}
        <CardAction>
          <Badge variant="secondary" size="xs" className="gap-1 text-xs">
            <Users className="size-3" aria-hidden="true" />
            {item.vendor_count}
          </Badge>
        </CardAction>
      </CardHeader>

      {period && (
        <>
          <Separator />
          <CardContent className="flex items-center gap-1.5 px-4 py-2.5 text-xs">
            <CalendarDays
              className="text-muted-foreground size-3 shrink-0"
              aria-hidden="true"
            />
            <span className="text-muted-foreground">
              {tfl("effectivePeriod")}:
            </span>
            <span className="truncate font-medium">{period}</span>
          </CardContent>
        </>
      )}
    </Card>
  );
}
