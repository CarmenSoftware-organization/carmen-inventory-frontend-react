import { CalendarDays, Store, FileBarChart, Receipt } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/currency-utils";
import type { GoodsReceiveNote } from "@/types/goods-receive-note";
import {
  GRN_STATUS_CONFIG,
  GRN_TYPE_CONFIG,
  GRN_DOC_TYPE_KEY,
} from "@/constant/goods-receive-note";
import { getGrnDocTypeLabel } from "@/constant/grn-doc-type";

interface GrnCardProps {
  readonly item: GoodsReceiveNote;
  readonly index?: number;
  readonly onEdit: (item: GoodsReceiveNote) => void;
}

export default function GrnCard({ item, index, onEdit }: GrnCardProps) {
  const tfl = useTranslations("field");
  const { dateFormat } = useProfile();

  const status = item.doc_status || "draft";
  const docTypeLabel = getGrnDocTypeLabel(tfl, item.doc_type);
  const totalAmount = item.total_amount;
  const currencyCode = item.currency_code;

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
            <CardTitle className="truncate text-sm">{item.grn_no}</CardTitle>
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <CalendarDays className="size-3 shrink-0" aria-hidden="true" />
              {item.grn_date ? formatDate(item.grn_date, dateFormat) : "-"}
            </div>
          </div>
        </div>
        <CardAction>
          <Badge
            size="sm"
            className={`${GRN_STATUS_CONFIG[status]?.className ?? ""} text-xs`}
          >
            {GRN_STATUS_CONFIG[status]?.label ?? status}
          </Badge>
        </CardAction>
      </CardHeader>

      <Separator />

      <CardContent className="space-y-2 px-4 py-3 text-xs">
        <div className="flex items-start gap-2">
          <Store
            className="text-muted-foreground mt-0.5 size-3 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">{tfl("vendor")}</p>
            <p className="truncate font-medium">{item.vendor_name}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Receipt
            className="text-muted-foreground mt-0.5 size-3 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">{tfl("invoiceNo")}</p>
            <p className="truncate font-medium">{item.invoice_no || "-"}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <FileBarChart
            className="text-muted-foreground mt-0.5 size-3 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">{tfl("type")}</p>
            <Badge
              size="sm"
              className={`${GRN_TYPE_CONFIG[GRN_DOC_TYPE_KEY[item.doc_type] ?? item.doc_type]?.className ?? ""} text-xs`}
            >
              {docTypeLabel}
            </Badge>
          </div>
        </div>
      </CardContent>

      {totalAmount != null && !Number.isNaN(totalAmount) && (
        <>
          <Separator />
          <CardFooter className="justify-between px-4 py-2.5">
            <span className="text-muted-foreground text-xs">
              {tfl("totalAmount")}
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {formatCurrency(totalAmount)}
              {currencyCode && (
                <span className="text-muted-foreground ml-1 text-xs font-normal">
                  {currencyCode}
                </span>
              )}
            </span>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
