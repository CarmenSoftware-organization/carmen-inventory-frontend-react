import {
  CalendarDays,
  Store,
  Truck,
  CalendarClock,
  Clock,
} from "lucide-react";
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
import type { PurchaseOrder } from "@/types/purchase-order";
import { PO_STATUS_CONFIG } from "@/constant/purchase-order";

interface PoCardProps {
  readonly item: PurchaseOrder;
  readonly index?: number;
  readonly onEdit: (item: PurchaseOrder) => void;
}

/**
 * การ์ดแสดงข้อมูล PO 1 รายการ สำหรับมุมมอง grid/mobile โดยแสดงเลขที่ PO,
 * วันที่สั่ง, สถานะ (สีตาม `PO_STATUS_CONFIG`), ผู้ขาย, วันจัดส่ง, เครดิต
 * เทอม และยอดเงินรวม สามารถคลิกหรือกด Enter/Space เพื่อเข้าสู่หน้าแก้ไข
 *
 * @param props - props ของการ์ด
 * @param props.item - ข้อมูล PO 1 รายการ
 * @param props.index - ลำดับที่ (เริ่มจาก 0) สำหรับแสดงป้ายเลข ถ้าไม่ส่งจะไม่แสดง
 * @param props.onEdit - callback เมื่อผู้ใช้เลือกการ์ดนี้เพื่อแก้ไข
 * @returns React element ของการ์ด PO
 * @example
 * <PoCard
 *   item={purchaseOrder}
 *   index={0}
 *   onEdit={(po) => router.push(`/procurement/purchase-order/${po.id}`)}
 * />
 */
export default function PoCard({ item, index, onEdit }: PoCardProps) {
  const tfl = useTranslations("field");
  const { dateFormat, dateTimeFormat } = useProfile();

  const status = item.po_status;
  const config = PO_STATUS_CONFIG[status];

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
      className="cursor-pointer gap-0 py-0 transition-colors hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardHeader className="px-4 py-3">
        <div className="flex items-start gap-2">
          {typeof index === "number" && (
            <span className="bg-muted text-muted-foreground mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-sm">{item.po_no}</CardTitle>
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <CalendarDays className="size-3 shrink-0" aria-hidden="true" />
              {formatDate(item.order_date, dateFormat)}
            </div>
          </div>
        </div>
        <CardAction>
          {status && (
            <Badge className={`${config?.className ?? ""} text-xs`} size="sm">
              {config?.label ?? status}
            </Badge>
          )}
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
            <p className="text-muted-foreground text-xs">
              {tfl("vendor")}
            </p>
            <p className="truncate font-semibold">{item.vendor_name}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Truck
            className="text-muted-foreground mt-0.5 size-3 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">
              {tfl("deliveryDate")}
            </p>
            <p className="truncate font-semibold">
              {formatDate(item.delivery_date, dateFormat)}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <CalendarClock
            className="text-muted-foreground mt-0.5 size-3 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">
              {tfl("creditTerm")}
            </p>
            <p className="truncate font-semibold">{item.credit_term_value} {tfl("creditTermDays")}</p>
          </div>
        </div>
        {item.audit?.updated?.at && (
          <div className="flex items-start gap-2">
            <Clock
              className="text-muted-foreground mt-0.5 size-3 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">{tfl("updated")}</p>
              <p className="truncate font-semibold">
                {formatDate(item.audit.updated.at, dateTimeFormat)}
              </p>
            </div>
          </div>
        )}
      </CardContent>

      {item.total_amount != null && !Number.isNaN(item.total_amount) && (
        <>
          <Separator />
          <CardFooter className="justify-between px-4 py-2">
            <span className="text-muted-foreground text-xs">
              {tfl("totalAmount")}
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {formatCurrency(Number(item.total_amount))}
              {item.currency_code && (
                <span className="text-muted-foreground ml-1 text-xs font-normal">
                  {item.currency_code}
                </span>
              )}
            </span>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
