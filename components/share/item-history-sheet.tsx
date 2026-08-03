import { useState } from "react";
import { GitBranch } from "lucide-react";
import {
  HistoryTimeline,
  HistoryTimelineItem,
} from "@/components/share/history-timeline";
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
  unknownStatusEntry,
  type StatusConfigEntry,
} from "@/constant/status-config";

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
 * timeline ประวัติ workflow ระดับรายการ (per-item) แบบคอลัมน์เดียวพร้อมรางเวลา
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
            <HistoryTimeline>
              {reversedHistory.map((entry, i) => {
                // ไม่มีในแผนที่ก็ยังต้องเป็นชิป dot-chip เหมือนตัวอื่น — ปล่อย
                // className ว่างจะกลายเป็นพื้นทึบสี primary นั่งเรืองข้างชิปปกติ
                const config =
                  statusConfig[entry.status] ??
                  unknownStatusEntry(entry.status);

                return (
                  <HistoryTimelineItem
                    key={`${entry.user.id}-${entry.seq}-${i}`}
                    at={entry.at}
                    marker={i === 0 ? "current" : "default"}
                    badge={
                      <Badge className={config.className} size="xs">
                        {config.label}
                      </Badge>
                    }
                    title={entry.user.name}
                  >
                    {(entry.name || entry.message) && (
                      <>
                        {entry.name}
                        {entry.message && (
                          <span className="block">{entry.message}</span>
                        )}
                      </>
                    )}
                  </HistoryTimelineItem>
                );
              })}
            </HistoryTimeline>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
