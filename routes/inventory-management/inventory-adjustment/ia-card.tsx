import { CalendarDays, MapPin, Package, Tag, Clock } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";
import { formatAmount } from "@/lib/currency-utils";
import {
  IA_STATUS_CONFIG,
  IA_TYPE_CONFIG,
  IA_TYPE_ICON,
} from "@/constant/inventory-adjustment";
import {
  getAdjustmentType,
  type InventoryAdjustment,
} from "@/types/inventory-adjustment";

interface IaCardProps {
  readonly item: InventoryAdjustment;
  readonly index?: number;
  readonly onEdit: (item: InventoryAdjustment) => void;
}

export default function IaCard({ item, index, onEdit }: IaCardProps) {
  const tfl = useTranslations("field");
  const { dateFormat, amountFormat, defaultCurrencyCode, dateTimeFormat } =
    useProfile();

  const typeKey = getAdjustmentType(item);
  const isStockIn = typeKey === "stock-in";
  const docNo = isStockIn ? item.si_no : item.so_no;
  const docDate = isStockIn ? item.si_date : item.so_date;
  const statusConfig =
    IA_STATUS_CONFIG[item.doc_status] ?? IA_STATUS_CONFIG.draft;
  const typeConfig = IA_TYPE_CONFIG[typeKey];
  const TypeIcon = IA_TYPE_ICON[typeKey];
  const itemCount =
    item.item_count ??
    (isStockIn ? item.stock_in_detail : item.stock_out_detail)?.length ??
    0;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    onEdit(item);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onEdit(item);
    }
  };

  // สีของ type ปรากฏ "ครั้งเดียว" ต่อการ์ด — ที่ label type ตัวเดียว เพราะมันมี
  // ทั้งคำและสี อ่านได้แม้ตาแยกสีไม่ออก ส่วนเส้นซ้ายสี / กล่องไอคอนย้อมสี /
  // ยอดเงินสี ถอดออกหมด (DESIGN.md single accent: สีเดิมซ้ำบน icon-box + icon +
  // chip บนพื้น neutral อ่านเป็น neon)
  const accentText = isStockIn ? "text-success-ink" : "text-destructive";

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className="group focus-visible:ring-ring hover:border-primary/40 relative cursor-pointer gap-0 overflow-hidden py-0 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      {/* ── Header ─────────────────────────────── */}
      <CardHeader className="relative space-y-0 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <TypeIcon
              className="text-muted-foreground mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-1.5">
                <CardTitle className="text-foreground truncate text-sm font-semibold tracking-tight">
                  {docNo}
                </CardTitle>
                {typeof index === "number" && (
                  <span className="text-muted-foreground text-micro-legal tabular-nums">
                    #{String(index + 1).padStart(2, "0")}
                  </span>
                )}
              </div>
              <div className="text-muted-foreground text-micro mt-1 flex flex-wrap items-center gap-1">
                <CalendarDays className="size-3 shrink-0" aria-hidden="true" />
                <span>{docDate && formatDate(docDate, dateFormat)}</span>
                {typeConfig?.label && (
                  <>
                    <span aria-hidden="true" className="opacity-50">
                      ·
                    </span>
                    <span
                      className={cn(
                        "font-semibold tracking-widest uppercase",
                        accentText,
                      )}
                    >
                      {typeConfig.label}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <Badge size="xs" className={cn(statusConfig.className, "shrink-0")}>
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      {/* ── Content ────────────────────────────── */}
      <CardContent className="relative space-y-1.5 px-4 pb-3">
        <div className="flex items-center gap-1.5 text-xs">
          <Tag
            className="text-muted-foreground size-3 shrink-0"
            aria-hidden="true"
          />
          <span className="truncate font-medium">
            {item.adjustment_type_name}
          </span>
        </div>
        {item.location_name && (
          <div className="flex items-center gap-1.5 text-xs">
            <MapPin
              className="text-muted-foreground size-3 shrink-0"
              aria-hidden="true"
            />
            <span className="text-muted-foreground truncate">
              {item.location_name}
            </span>
          </div>
        )}
        {item.audit?.updated?.at && (
          <div className="flex items-center gap-1.5 text-xs">
            <Clock
              className="text-muted-foreground size-3 shrink-0"
              aria-hidden="true"
            />
            <span className="text-muted-foreground truncate">
              {tfl("updated")}:{" "}
              {formatDate(item.audit.updated.at, dateTimeFormat)}
            </span>
          </div>
        )}
      </CardContent>

      {/* ── Footer — items count + emphasized total ── */}
      <CardFooter className="relative items-end justify-between gap-2 border-t px-4 py-2">
        <div className="flex items-center gap-1.5">
          <Package
            className="text-muted-foreground size-3 shrink-0"
            aria-hidden="true"
          />
          <span className="text-muted-foreground text-micro">
            {itemCount} {tfl("items")}
          </span>
        </div>
        <div className="text-right">
          <p className="text-base leading-none font-semibold tabular-nums">
            {formatAmount(item.base_total_cost, amountFormat)}
          </p>
          {defaultCurrencyCode && (
            <p className="text-muted-foreground text-micro-legal mt-1 font-semibold tracking-widest uppercase">
              {defaultCurrencyCode}
            </p>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
