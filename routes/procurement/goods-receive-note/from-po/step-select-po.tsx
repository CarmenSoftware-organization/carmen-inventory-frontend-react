import { useTranslations } from "use-intl";
import { ClipboardList, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import EmptyComponent from "@/components/empty-component";
import { cn } from "@/lib/utils";
import { GRN_PO_STATUS_CONFIG } from "@/constant/goods-receive-note";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/currency-utils";
import type { PoForGrn } from "@/types/purchase-order";

interface StepSelectPoProps {
  /** ใบสั่งซื้อของผู้ขายที่เลือก — หน้าแม่เป็นคนโหลด เพราะต้องใช้ตอนกดยืนยันด้วย */
  readonly poList: readonly PoForGrn[];
  readonly isLoading: boolean;
  readonly selected: ReadonlySet<string>;
  readonly onChange: (next: Set<string>) => void;
}

/**
 * เลือกใบสั่งซื้อและรายการที่จะรับ — ติ๊กได้สองระดับ (ทั้งใบ / รายบรรทัด)
 *
 * ยังเป็นลิสต์ซ้อนลิสต์ ไม่ใช่ DataGrid เพราะการติ๊กสองระดับที่หัวใบคุมลูกทั้งก้อน
 * ไม่ใช่สิ่งที่ตารางแบนทำได้ — ตารางต้องกางแถวย่อยซึ่งกลับไปเป็นของเดิมที่เพิ่ง
 * เลิกใช้ในตารางสินค้า
 */
export function StepSelectPo({
  poList,
  isLoading,
  selected,
  onChange,
}: StepSelectPoProps) {
  const t = useTranslations("procurement.goodsReceiveNote");
  const tfl = useTranslations("field");
  const { dateFormat } = useProfile();

  const allDetailIds = poList.flatMap((po) => po.po_detail.map((d) => d.id));

  const toggleDetail = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const togglePo = (po: PoForGrn) => {
    const ids = po.po_detail.map((d) => d.id);
    const next = new Set(selected);
    if (ids.every((id) => next.has(id))) ids.forEach((id) => next.delete(id));
    else ids.forEach((id) => next.add(id));
    onChange(next);
  };

  const isAllSelected =
    allDetailIds.length > 0 && allDetailIds.every((id) => selected.has(id));
  const isSomeSelected = !isAllSelected && selected.size > 0;

  const toggleAll = () =>
    onChange(isAllSelected ? new Set() : new Set(allDetailIds));

  const poChecked = (po: PoForGrn) => {
    const ids = po.po_detail.map((d) => d.id);
    const count = ids.filter((id) => selected.has(id)).length;
    if (count === 0) return false;
    if (count === ids.length) return true;
    return "indeterminate" as const;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-60 items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  if (poList.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12">
        <EmptyComponent
          icon={ClipboardList}
          title={t("noPo")}
          description={t("noPoDesc")}
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <label className="hover:bg-muted/40 flex cursor-pointer items-center gap-2.5 border-b px-4 py-2.5 transition-colors">
        <Checkbox
          checked={
            isAllSelected || (isSomeSelected && "indeterminate") || false
          }
          onCheckedChange={toggleAll}
        />
        <span className="text-foreground text-xs font-medium">
          {tfl("selectAll")}
        </span>
        <span className="text-muted-foreground text-micro">
          {t("poCount", { count: poList.length })} · {allDetailIds.length}{" "}
          {tfl("items").toLowerCase()}
        </span>
        {selected.size > 0 && (
          <Badge
            variant="primary-light"
            size="xs"
            className="ml-auto tabular-nums"
          >
            {t("nSelected", { count: selected.size })}
          </Badge>
        )}
      </label>

      <div className="max-h-[26rem] overflow-y-auto">
        {poList.map((po) => (
          <div key={po.id} className="border-b last:border-b-0">
            <label className="bg-muted/30 flex cursor-pointer items-center gap-2.5 px-4 py-2">
              <Checkbox
                checked={poChecked(po)}
                onCheckedChange={() => togglePo(po)}
              />
              <span className="text-foreground text-xs font-medium">
                {po.po_no}
              </span>
              {po.grn_status && (
                <Badge
                  size="xs"
                  className={GRN_PO_STATUS_CONFIG[po.grn_status]?.className}
                >
                  {po.grn_status.toUpperCase().replaceAll("_", " ")}
                </Badge>
              )}
              <span className="text-muted-foreground text-micro">
                {formatDate(po.order_date, dateFormat)}
              </span>
              <span className="ml-auto text-xs font-semibold tabular-nums">
                {formatCurrency(
                  po.po_detail.reduce((sum, d) => sum + d.net_amount, 0),
                )}{" "}
                <span className="text-muted-foreground font-normal">
                  {po.currency_code}
                </span>
              </span>
            </label>

            {po.po_detail.map((d) => {
              const checked = selected.has(d.id);
              return (
                <label
                  key={d.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 border-t py-2 pr-4 pl-10 transition-colors",
                    checked ? "bg-primary/5" : "hover:bg-muted/20",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleDetail(d.id)}
                  />
                  <span className="text-muted-foreground text-micro shrink-0 tabular-nums">
                    {d.product_code}
                  </span>
                  <span className="text-foreground min-w-0 flex-1 truncate text-xs">
                    {d.product_name}
                  </span>
                  <span className="w-14 shrink-0 text-right text-xs tabular-nums">
                    {d.order_qty}
                  </span>
                  <span className="text-muted-foreground text-micro w-10 shrink-0 text-center">
                    {d.order_unit_name}
                  </span>
                  <span className="w-20 shrink-0 text-right text-xs tabular-nums">
                    {formatCurrency(d.price)}
                  </span>
                  <span className="w-24 shrink-0 text-right text-xs font-semibold tabular-nums">
                    {formatCurrency(d.net_amount)}
                  </span>
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
