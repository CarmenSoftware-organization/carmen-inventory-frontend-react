
import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import {
  ClipboardCheck,
  ClipboardList,
  Loader2,
  Package,
  PackageCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import EmptyComponent from "@/components/empty-component";
import { usePurchaseOrderForGrnByVendor } from "@/hooks/use-purchase-order";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/currency-utils";
import type { PoForGrn } from "@/types/purchase-order";
import { GRN_PO_STATUS_CONFIG } from "@/constant/goods-receive-note";

interface GrnPoSelectDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly vendorId: string;
  readonly excludeIds: Set<string>;
  readonly onSelect: (poList: PoForGrn[]) => void;
}

export function GrnPoSelectDialog({
  open,
  onOpenChange,
  vendorId,
  excludeIds,
  onSelect,
}: GrnPoSelectDialogProps) {
  const t = useTranslations("procurement.goodsReceiveNote");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const { dateFormat } = useProfile();

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch } = usePurchaseOrderForGrnByVendor(vendorId);

  useEffect(() => {
    if (open && vendorId) refetch();
  }, [open, vendorId, refetch]);

  // reset การเลือกเมื่อปิด dialog — กัน checkbox ค้างจากครั้งก่อนตอนเปิดใหม่
  const handleOpenChange = (next: boolean) => {
    if (!next) setSelected(new Set());
    onOpenChange(next);
  };

  const allPos = data?.data ?? [];
  const poList =
    excludeIds.size === 0
      ? allPos
      : allPos.filter((po) => !excludeIds.has(po.id));

  const allDetailIds = poList.flatMap((po) => po.po_detail.map((d) => d.id));

  const selectedCount = selected.size;

  const toggleDetail = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePo = (po: PoForGrn) => {
    const ids = po.po_detail.map((d) => d.id);
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = ids.every((id) => next.has(id));
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (
        prev.size === allDetailIds.length &&
        allDetailIds.every((id) => prev.has(id))
      ) {
        return new Set();
      }
      return new Set(allDetailIds);
    });
  };

  const isAllSelected =
    allDetailIds.length > 0 && allDetailIds.every((id) => selected.has(id));
  const isSomeSelected = !isAllSelected && selected.size > 0;

  const handleConfirm = () => {
    const result: PoForGrn[] = [];
    for (const po of poList) {
      const selectedDetails = po.po_detail.filter((d) => selected.has(d.id));
      if (selectedDetails.length > 0) {
        result.push({ ...po, po_detail: selectedDetails });
      }
    }
    onSelect(result);
    handleOpenChange(false);
  };

  const getPoChecked = (po: PoForGrn) => {
    const ids = po.po_detail.map((d) => d.id);
    const count = ids.filter((id) => selected.has(id)).length;
    if (count === 0) return false;
    if (count === ids.length) return true;
    return "indeterminate" as const;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col gap-0 p-0 pt-2 sm:max-w-[70vw]!">
        <div className="relative space-y-4 px-6 pt-6 pb-4">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                <PackageCheck className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="bg-primary/10 text-primary mb-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold">
                  {t("entity")}
                </div>
                <DialogTitle className="text-base">{t("selectPo")}</DialogTitle>
                <DialogDescription className="mt-1">
                  {t("selectPoDesc")}
                </DialogDescription>
              </div>
              {selectedCount > 0 && (
                <Badge
                  variant="primary-light"
                  size="sm"
                  className="mt-0.5 shrink-0 tabular-nums"
                >
                  {t("nSelected", { count: selectedCount })}
                </Badge>
              )}
            </div>
          </DialogHeader>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-6 pb-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground size-6 animate-spin" />
            </div>
          )}

          {!isLoading && poList.length === 0 && (
            <div className="py-12">
              <EmptyComponent
                icon={ClipboardList}
                title={t("noPo")}
                description={t("noPoDesc")}
              />
            </div>
          )}

          {!isLoading && poList.length > 0 && (
            <div className="flex-1 space-y-2 overflow-y-auto">
              {/* Select all */}
              <label className="hover:bg-muted/40 flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 transition-colors">
                <Checkbox
                  checked={
                    isAllSelected ||
                    (isSomeSelected && "indeterminate") ||
                    false
                  }
                  onCheckedChange={toggleAll}
                />
                <span className="text-xs font-semibold">{tfl("selectAll")}</span>
                <span className="text-muted-foreground text-[0.6875rem]">
                  · {poList.length} PO · {allDetailIds.length} items
                </span>
              </label>

              {poList.map((po) => {
                const checked = getPoChecked(po);
                const isHighlighted =
                  checked === true || checked === "indeterminate";
                return (
                  <div
                    key={po.id}
                    className={`overflow-hidden rounded-xl border transition-all ${
                      isHighlighted
                        ? "border-primary/40 bg-primary/5 ring-primary/20 ring-2"
                        : "hover:border-primary/30 bg-card"
                    }`}
                  >
                    {/* PO header */}
                    <label className="bg-muted/30 flex cursor-pointer items-center gap-2 border-b px-3 py-2">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => togglePo(po)}
                      />
                      <div className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-md">
                        <ClipboardList className="size-3.5" />
                      </div>
                      <Badge
                        variant="outline"
                        size="xs"
                        className="text-[0.625rem]"
                      >
                        {po.po_no}
                      </Badge>
                      {po.grn_status && (
                        <Badge
                          size="xs"
                          className={
                            GRN_PO_STATUS_CONFIG[po.grn_status]?.className
                          }
                        >
                          {po.grn_status.toUpperCase().replaceAll("_", " ")}
                        </Badge>
                      )}
                      <span className="text-muted-foreground text-[0.6875rem]">
                        {formatDate(po.order_date, dateFormat)}
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1 text-[0.6875rem]">
                        <Package className="size-3" aria-hidden="true" />
                        {po.po_detail.length}
                      </span>
                      <span className="ml-auto text-xs font-semibold tabular-nums">
                        {formatCurrency(
                          po.po_detail.reduce(
                            (sum, d) => sum + d.net_amount,
                            0,
                          ),
                        )}{" "}
                        <span className="text-muted-foreground font-normal">
                          {po.currency_code}
                        </span>
                      </span>
                    </label>

                    {/* Product rows — tree style */}
                    <div className="py-1">
                      {po.po_detail.map((d, dIdx) => {
                        const isLast = dIdx === po.po_detail.length - 1;
                        const detailChecked = selected.has(d.id);
                        return (
                          <label
                            key={d.id}
                            className={`flex cursor-pointer items-center gap-2 py-1.5 pr-3 transition-colors ${
                              detailChecked
                                ? "bg-primary/5"
                                : "hover:bg-muted/20"
                            }`}
                          >
                            {/* Tree connector */}
                            <div className="relative ml-4 flex w-5 shrink-0 items-center justify-center self-stretch">
                              <span
                                className="border-border absolute top-0 left-1/2 border-l"
                                style={{ height: isLast ? "50%" : "100%" }}
                              />
                              <span className="border-border relative z-10 w-2.5 border-b" />
                            </div>

                            <Checkbox
                              checked={detailChecked}
                              onCheckedChange={() => toggleDetail(d.id)}
                            />
                            <Badge
                              variant="outline"
                              size="xs"
                              className="text-[0.625rem]"
                            >
                              {d.product_code}
                            </Badge>
                            <span className="min-w-0 flex-1 truncate text-xs">
                              {d.product_name}
                            </span>
                            <span className="w-14 shrink-0 text-right text-xs tabular-nums">
                              {d.order_qty}
                            </span>
                            <span className="text-muted-foreground w-10 shrink-0 text-center text-[0.6875rem]">
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
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="bg-muted/20 items-center border-t px-6 py-3 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(false)}
            className="text-muted-foreground"
          >
            {tc("cancel")}
          </Button>
          <Button
            size="default"
            disabled={selectedCount === 0}
            onClick={handleConfirm}
          >
            <ClipboardCheck aria-hidden="true" />
            {tc("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
