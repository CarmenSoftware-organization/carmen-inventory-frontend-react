import { useState } from "react";
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
import type { StatusConfigEntry } from "@/constant/status-config";
import { formatDate } from "@/lib/date-utils";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";

/** ประวัติ workflow ระดับรายการ 1 ก้าว — โครงเดียวกันทั้ง PR / PO / SR */
export interface ItemHistoryEntry {
  at: string;
  seq: number;
  name: string;
  /** name ไม่บังคับ — บาง entry หลังบ้านส่งมาแค่ id (เช่นประวัติของ PO) */
  user: { id: string; name?: string };
  status: string;
  message?: string | null;
}

interface ItemHistorySheetProps {
  readonly history: ItemHistoryEntry[];
  readonly productName?: string;
  /** map สถานะ → สี/ป้ายของโมดูลนั้น (เช่น `ITEM_HISTORY_STATUS_CONFIG`) */
  readonly statusConfig: Record<string, StatusConfigEntry>;
  /** ป้ายปุ่ม + หัว sheet (เช่น `t("tabWorkflowHistory")`) */
  readonly label: string;
}

/**
 * ปุ่มไอคอน git-branch ในคอลัมน์ action ของตารางรายการ กดแล้วเปิด sheet แสดง
 * timeline ประวัติ workflow ระดับรายการ (per-item) แบบซิกแซกสลับซ้าย/ขวา
 * เรียงล่าสุดขึ้นบนสุด — โครงเดียวกับ workflow history ระดับเอกสาร
 *
 * ใช้ร่วมกันทุกโมดูลที่มีประวัติรายบรรทัด (PR/PO/SR) — สิ่งที่ต่างกันคือชุดสถานะ
 * กับป้ายเท่านั้น จึงรับมาเป็น prop ไม่ผูกกับโมดูลใดโมดูลหนึ่ง
 *
 * @param props.history - ประวัติของรายการนั้น (เรียงเก่า→ใหม่ ตามที่ backend ส่งมา)
 * @param props.productName - ชื่อสินค้า โชว์เป็นคำอธิบายใต้หัว sheet
 * @param props.statusConfig - map สถานะ → สี/ป้ายของโมดูล
 * @param props.label - ป้ายปุ่มและหัว sheet
 * @returns React element ของปุ่ม + sheet timeline
 * @example
 * <ItemHistorySheet
 *   history={item.history}
 *   productName={item.product_name}
 *   statusConfig={ITEM_HISTORY_STATUS_CONFIG}
 *   label={t("tabWorkflowHistory")}
 * />
 */
export function ItemHistorySheet({
  history,
  productName,
  statusConfig,
  label,
}: ItemHistorySheetProps) {
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
        aria-label={label}
        title={label}
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
            <SheetTitle>{label}</SheetTitle>
            <SheetDescription>{productName ?? ""}</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <Timeline
              defaultValue={reversedHistory.length}
              orientation="vertical"
            >
              {reversedHistory.map((entry, i) => {
                const config = statusConfig[entry.status] ?? {
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
                        {entry.user.name && (
                          <TimelineTitle>{entry.user.name}</TimelineTitle>
                        )}
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
