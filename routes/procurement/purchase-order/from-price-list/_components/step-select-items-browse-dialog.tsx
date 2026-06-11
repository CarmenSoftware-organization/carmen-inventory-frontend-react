
import { useState } from "react";
import { useTranslations } from "use-intl";
import { AlertTriangle, ChevronRight, PackagePlus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyComponent from "@/components/empty-component";
import { cn } from "@/lib/utils";
import { useActivePriceListsByVendor } from "@/hooks/use-price-list";
import type { PriceList, PriceListDetailItem } from "@/types/price-list";

interface BrowseDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly vendorId: string | null | undefined;
  readonly apiDate: string | undefined;
  /** product_ids ที่อยู่ใน form แล้ว — แสดงเป็น disabled + ติ๊ก preselect ไม่ได้ */
  readonly existingProductIds: ReadonlySet<string>;
  /**
   * เรียกตอน user กด Add — ส่ง details ที่เลือกใหม่ + currency ของ PL
   * (ทุก PL ของ vendor เดียวกันปกติ currency เดียวกัน — ส่งกลับ
   * เพื่อให้ parent set ลง form.currency_id/code)
   */
  readonly onAdd: (
    details: PriceListDetailItem[],
    currency: { id: string; code: string; name: string } | null,
  ) => void;
}

interface PlGroup {
  pricelist_id: string;
  pricelist_no: string;
  currency: { id: string; code: string; name: string };
  details: PriceListDetailItem[];
}

function groupByPriceList(priceLists: PriceList[]): PlGroup[] {
  return priceLists.map((pl) => ({
    pricelist_id: pl.id,
    pricelist_no: pl.no,
    currency: pl.currency,
    details: pl.pricelist_detail,
  }));
}

/**
 * สกุลเงินที่ "กำลังเลือก" — currency ของ PL ตัวแรกที่มี detail ถูก pick
 * (null = ยังไม่ได้เลือกอะไร → ทุก currency เลือกได้). ใช้ล็อกให้ 1 order
 * มีได้สกุลเงินเดียว
 */
function findActiveCurrency(
  groups: PlGroup[],
  picked: Set<string>,
): PlGroup["currency"] | null {
  for (const g of groups) {
    if (g.details.some((d) => picked.has(d.id))) return g.currency;
  }
  return null;
}

function filterGroups(groups: PlGroup[], q: string): PlGroup[] {
  if (!q) return groups;
  const needle = q.toLowerCase();
  return groups
    .map((g) => ({
      ...g,
      details: g.details.filter(
        (d) =>
          (d.product_code ?? "").toLowerCase().includes(needle) ||
          d.product_name.toLowerCase().includes(needle) ||
          d.product_local_name.toLowerCase().includes(needle) ||
          g.pricelist_no.toLowerCase().includes(needle),
      ),
    }))
    .filter((g) => g.details.length > 0);
}

/**
 * Browse dialog — เลือก product จาก active price lists ของ vendor
 *
 * แสดง list ที่ group ตาม `pricelist_no` พร้อม collapse/expand + multi-select
 * checkbox ผ่าน local state. Product ที่อยู่ใน form แล้วแสดงเป็น disabled
 * (ป้องกัน duplicate)
 *
 * @param props.open - state เปิด/ปิด dialog
 * @param props.onOpenChange - callback ปิด dialog
 * @param props.vendorId - vendor ที่เลือกใน Step 2
 * @param props.apiDate - delivery date format `yyyy-MM-dd`
 * @param props.existingProductIds - product_ids ที่ user เลือกไปแล้วใน form
 * @param props.onAdd - callback ส่ง details ที่เลือกใหม่กลับไปให้ parent
 */
export function BrowseDialog({
  open,
  onOpenChange,
  vendorId,
  apiDate,
  existingProductIds,
  onAdd,
}: BrowseDialogProps) {
  const t = useTranslations("procurement.purchaseOrder");
  const tc = useTranslations("common");

  const {
    data: priceLists = [],
    isLoading,
    error,
  } = useActivePriceListsByVendor(vendorId, apiDate);

  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Reset state แล้วปิด dialog — เรียกในทุก close path (Cancel/Add/onOpenChange)
  // เพื่อให้ครั้งหน้าที่เปิดมาเริ่มสะอาด โดยไม่พึ่ง useEffect [open]
  const closeAndReset = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearch("");
      setPicked(new Set());
      setCollapsed(new Set());
    }
    onOpenChange(nextOpen);
  };

  const allGroups = groupByPriceList(priceLists);
  const groups = filterGroups(allGroups, search.trim());

  // ล็อก 1 order = 1 สกุลเงิน — currency ที่ pick ไว้ตัวแรกเป็นตัว active
  // กลุ่มที่ currency ต่างจาก active จะ disabled จนกว่าจะ uncheck หมด
  const activeCurrency = findActiveCurrency(allGroups, picked);
  const isGroupLocked = (group: PlGroup) =>
    activeCurrency != null && group.currency.id !== activeCurrency.id;

  const togglePick = (detailId: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(detailId)) next.delete(detailId);
      else next.add(detailId);
      return next;
    });
  };

  const toggleGroup = (plId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(plId)) next.delete(plId);
      else next.add(plId);
      return next;
    });
  };

  const togglePickAll = (group: PlGroup) => {
    if (isGroupLocked(group)) return;
    const pickableIds = group.details
      .filter((d) => !existingProductIds.has(d.product_id))
      .map((d) => d.id);
    if (pickableIds.length === 0) return;
    const allPicked = pickableIds.every((id) => picked.has(id));
    setPicked((prev) => {
      const next = new Set(prev);
      if (allPicked) {
        for (const id of pickableIds) next.delete(id);
      } else {
        for (const id of pickableIds) next.add(id);
      }
      return next;
    });
  };

  const handleAdd = () => {
    // dedup by product_id (same product จาก PL ต่างกัน → keep first picked)
    const byProduct = new Map<string, PriceListDetailItem>();
    let currency: { id: string; code: string; name: string } | null = null;
    for (const g of allGroups) {
      for (const d of g.details) {
        if (picked.has(d.id) && !byProduct.has(d.product_id)) {
          byProduct.set(d.product_id, d);
          currency ??= g.currency;
        }
      }
    }
    onAdd(Array.from(byProduct.values()), currency);
    closeAndReset(false);
  };

  const pickedCount = picked.size;

  return (
    <Dialog open={open} onOpenChange={closeAndReset}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-1 text-base">
            <PackagePlus aria-hidden="true" />
            {t("browseFromPriceList")}
          </DialogTitle>
          <DialogDescription>{t("browseFromPriceListDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-6 py-3">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchProduct")}
              className="h-8 pl-8 text-xs"
            />
          </div>
          {activeCurrency && (
            <div
              className="border-warning/30 bg-warning/5 text-warning-foreground flex items-start gap-2 rounded-md border px-3 py-2 text-[0.6875rem]"
              role="status"
              aria-live="polite"
            >
              <AlertTriangle
                aria-hidden="true"
                className="text-warning mt-px size-3.5 shrink-0"
              />
              <span>
                {t("singleCurrencyHint", { currency: activeCurrency.code })}
              </span>
            </div>
          )}
        </div>

        <ScrollArea className="min-h-80 flex-1 border-y">
          {error && (
            <p className="text-destructive p-3 text-xs">
              {error instanceof Error ? error.message : String(error)}
            </p>
          )}
          {isLoading && (
            <div className="space-y-2 p-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {!isLoading && !error && groups.length === 0 && (
            <div className="py-10">
              <EmptyComponent
                title={t("noItemsAvailable")}
                description={t("noItemsAvailableDesc")}
              />
            </div>
          )}
          {!isLoading && !error && groups.length > 0 && (
            <div className="divide-y">
              {groups.map((group) => {
                const pickableIds = group.details
                  .filter((d) => !existingProductIds.has(d.product_id))
                  .map((d) => d.id);
                const pickedInGroup = pickableIds.filter((id) =>
                  picked.has(id),
                ).length;
                const groupState =
                  pickableIds.length === 0
                    ? false
                    : pickedInGroup === 0
                      ? false
                      : pickedInGroup === pickableIds.length
                        ? true
                        : "indeterminate";
                const expanded = !collapsed.has(group.pricelist_id);
                const locked = isGroupLocked(group);
                return (
                  <div
                    key={group.pricelist_id}
                    className={cn(locked && "opacity-50")}
                  >
                    <div className="bg-muted/30 flex items-center gap-2 px-4 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => toggleGroup(group.pricelist_id)}
                        aria-label={expanded ? "Collapse" : "Expand"}
                        aria-expanded={expanded}
                      >
                        <ChevronRight
                          aria-hidden="true"
                          className={cn(
                            "size-3.5 transition-transform",
                            expanded && "rotate-90",
                          )}
                        />
                      </Button>
                      <Checkbox
                        id={`browse-pl-${group.pricelist_id}`}
                        checked={groupState}
                        disabled={pickableIds.length === 0 || locked}
                        onCheckedChange={() => togglePickAll(group)}
                        aria-label={`Select all in ${group.pricelist_no}`}
                      />
                      <label
                        htmlFor={`browse-pl-${group.pricelist_id}`}
                        className={cn(
                          "text-xs font-semibold",
                          !locked && "cursor-pointer",
                        )}
                      >
                        {group.pricelist_no}
                      </label>
                      <Badge variant="outline" size="xs">
                        {group.currency.code}
                      </Badge>
                      <Badge variant="secondary" size="xs">
                        {pickedInGroup}/{group.details.length}
                      </Badge>
                    </div>
                    {expanded && (
                      <div className="divide-border/40 divide-y">
                        {group.details.map((detail) => {
                          const isExisting = existingProductIds.has(
                            detail.product_id,
                          );
                          const isPicked = picked.has(detail.id);
                          const id = `browse-${group.pricelist_id}-${detail.id}`;
                          return (
                            <div
                              key={detail.id}
                              className={cn(
                                "flex items-center gap-2 px-4 py-1.5 text-xs",
                                isExisting && "opacity-60",
                              )}
                            >
                              <div className="w-5" aria-hidden="true" />
                              <Checkbox
                                id={id}
                                checked={isExisting ? true : isPicked}
                                disabled={isExisting || locked}
                                onCheckedChange={() => togglePick(detail.id)}
                              />
                              <label
                                htmlFor={id}
                                className={cn(
                                  "flex flex-1 items-center gap-2",
                                  !isExisting && !locked && "cursor-pointer",
                                )}
                              >
                                <span className="text-muted-foreground">
                                  {detail.product_code}
                                </span>
                                <span className="font-medium">
                                  {detail.product_name}
                                </span>
                                {isExisting && (
                                  <Badge variant="secondary" size="xs">
                                    {t("alreadyAdded")}
                                  </Badge>
                                )}
                              </label>
                              <span className="text-muted-foreground text-[0.6875rem]">
                                {detail.unit_name ?? "—"}
                              </span>
                              <span className="text-foreground/80 w-20 text-right tabular-nums">
                                {detail.price.toLocaleString()}
                              </span>
                              <span className="text-muted-foreground w-10 text-[0.6875rem]">
                                {group.currency.code}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="bg-muted/20 items-center px-6 py-3 sm:justify-between">
          <span className="text-muted-foreground text-xs">
            {t("nItemsSelected", { count: pickedCount })}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => closeAndReset(false)}
            >
              {tc("cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pickedCount === 0}
              onClick={handleAdd}
              className="bg-module-procurement"
            >
              {t("addNItems", { count: pickedCount })}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
