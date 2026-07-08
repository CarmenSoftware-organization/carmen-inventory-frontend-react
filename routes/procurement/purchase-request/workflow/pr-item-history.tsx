import { useState } from "react";
import { useTranslations } from "use-intl";
import { GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/ui/timeline";
import { PR_ITEM_HISTORY_STATUS_CONFIG } from "@/constant/purchase-request";
import type { PrItemHistoryEntry } from "@/types/purchase-request";
import { formatDate } from "@/lib/date-utils";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";

interface PrItemHistorySheetProps {
  readonly history: PrItemHistoryEntry[];
  readonly productName?: string;
}

/**
 * ปุ่มไอคอน git-branch ในคอลัมน์ action ของตารางรายการใบขอซื้อ กดแล้วเปิด sheet
 * แสดง timeline ประวัติ workflow ระดับรายการ (per-item) ในรูปแบบซิกแซกสลับซ้าย/ขวา
 * เรียงล่าสุดขึ้นบนสุด — โครงเดียวกับ PrWorkflowHistory ระดับเอกสาร
 * @param props - ประวัติของรายการ (history) และชื่อสินค้า (productName) สำหรับหัว sheet
 * @returns React element ของปุ่ม + sheet timeline ประวัติรายการ
 * @example
 * <PrItemHistorySheet history={item.history} productName={item.product_name} />
 */
export function PrItemHistorySheet({
  history,
  productName,
}: PrItemHistorySheetProps) {
  const t = useTranslations("procurement.purchaseRequest");
  const { dateFormat } = useProfile();
  const [open, setOpen] = useState(false);

  // Reverse เพื่อให้ล่าสุดขึ้นบนสุด
  const reversedHistory = [...history].reverse();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={t("tabWorkflowHistory")}
        title={t("tabWorkflowHistory")}
        onClick={() => setOpen(true)}
      >
        <GitBranch className="size-3.5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-xl lg:max-w-2xl"
        >
          <SheetHeader>
            <SheetTitle>{t("tabWorkflowHistory")}</SheetTitle>
            <SheetDescription>{productName ?? ""}</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <Timeline
              defaultValue={reversedHistory.length}
              orientation="vertical"
            >
              {reversedHistory.map((entry, i) => {
                const config = PR_ITEM_HISTORY_STATUS_CONFIG[entry.status] ?? {
                  className: "",
                  label: entry.status,
                };
                const isEven = i % 2 === 0;

                return (
                  <TimelineItem
                    key={`${entry.user.id}-${entry.seq}-${i}`}
                    step={i + 1}
                    className={cn(
                      "w-[calc(50%-1.5rem)]",
                      // Even (index 0, 2, 4...) = ขวา
                      "even:ms-auto",
                      // Odd (index 1, 3, 5...) = ซ้าย
                      "odd:me-auto odd:text-right",
                      // Odd: ย้าย indicator และ separator ไปขวา
                      "odd:group-data-[orientation=vertical]/timeline:ms-0 odd:group-data-[orientation=vertical]/timeline:me-8",
                      "odd:group-data-[orientation=vertical]/timeline:**:data-[slot=timeline-indicator]:-right-6",
                      "odd:group-data-[orientation=vertical]/timeline:**:data-[slot=timeline-indicator]:left-auto",
                      "odd:group-data-[orientation=vertical]/timeline:**:data-[slot=timeline-indicator]:translate-x-1/2",
                      "odd:group-data-[orientation=vertical]/timeline:**:data-[slot=timeline-separator]:-right-6",
                      "odd:group-data-[orientation=vertical]/timeline:**:data-[slot=timeline-separator]:left-auto",
                      "odd:group-data-[orientation=vertical]/timeline:**:data-[slot=timeline-separator]:translate-x-1/2",
                    )}
                  >
                    <TimelineHeader className="space-y-1">
                      <TimelineSeparator />
                      <TimelineIndicator />
                      <TimelineDate>
                        {formatDate(entry.at, `${dateFormat} HH:mm`)}
                      </TimelineDate>
                      <div
                        className={cn(
                          "flex items-center gap-2",
                          isEven && "flex-row-reverse",
                        )}
                      >
                        <TimelineTitle>{entry.user.name}</TimelineTitle>
                        <Badge className={config.className} size="xs">
                          {config.label}
                        </Badge>
                      </div>
                    </TimelineHeader>
                    {(entry.name || entry.message) && (
                      <TimelineContent>
                        {entry.name && <span>{entry.name}</span>}
                        {entry.message && (
                          <span className="text-muted-foreground block">
                            {entry.message}
                          </span>
                        )}
                      </TimelineContent>
                    )}
                  </TimelineItem>
                );
              })}
            </Timeline>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
