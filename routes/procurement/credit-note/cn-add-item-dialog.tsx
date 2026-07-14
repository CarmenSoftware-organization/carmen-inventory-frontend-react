import { useMemo, useState } from "react";
import { useTranslations } from "use-intl";
import { PackagePlus, Search } from "lucide-react";
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
import { formatCurrency, round2 } from "@/lib/currency-utils";
import { useGoodsReceiveNoteById } from "@/hooks/use-goods-receive-note";
import type { GoodsReceiveNote } from "@/types/goods-receive-note";

/** 1 บรรทัดที่เลือกได้ = product+location+received-line ของ GRN */
export interface CnGrnLine {
  /** key เฉพาะของบรรทัด = detailId:itemId */
  key: string;
  /** key กันซ้ำระดับ product+location */
  dedupeKey: string;
  product_id: string;
  product_name: string;
  product_local_name: string;
  location_id: string;
  location_code: string;
  location_name: string;
  unit_id: string;
  unit_name: string;
  quantity: number;
  unit_price: number;
  discount_rate: number;
  tax_profile_id: string | null;
  tax_profile_name: string;
  tax_rate: number;
}

/** flatten GRN detail → บรรทัดที่เลือกได้ (unit_price = sub_total/received_qty เหมือน GRN form) */
function toLines(grn: GoodsReceiveNote | undefined): CnGrnLine[] {
  if (!grn?.good_received_note_detail) return [];
  const lines: CnGrnLine[] = [];
  for (const d of grn.good_received_note_detail) {
    for (const item of d.items ?? []) {
      const qty = Number(item.received_qty) || 0;
      lines.push({
        key: `${d.id}:${item.id}`,
        dedupeKey: `${d.product_id}:${d.location_id ?? ""}`,
        product_id: d.product_id,
        product_name: d.product_name,
        product_local_name: d.product_local_name ?? "",
        location_id: d.location_id ?? "",
        location_code: d.location_code ?? "",
        location_name: d.location_name,
        unit_id: item.received_unit_id ?? "",
        unit_name: item.received_unit_name ?? "",
        quantity: qty,
        unit_price: qty > 0 ? round2(item.sub_total_price / qty) : 0,
        // seed discount %/tax profile จาก GRN — rate scale ตาม qty ที่คืน
        discount_rate: Number(item.discount_rate) || 0,
        tax_profile_id: item.tax_profile_id ?? null,
        tax_profile_name: item.tax_profile_name ?? "",
        tax_rate: Number(item.tax_rate) || 0,
      });
    }
  }
  return lines;
}

function filterLines(lines: CnGrnLine[], q: string): CnGrnLine[] {
  if (!q) return lines;
  const needle = q.toLowerCase();
  return lines.filter(
    (l) =>
      l.product_name.toLowerCase().includes(needle) ||
      l.product_local_name.toLowerCase().includes(needle) ||
      l.location_name.toLowerCase().includes(needle) ||
      l.location_code.toLowerCase().includes(needle),
  );
}

interface Props {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly grnId: string | undefined;
  /** product:location ที่อยู่ใน form แล้ว — แสดง disabled ป้องกันซ้ำ */
  readonly existingKeys: ReadonlySet<string>;
  readonly onAdd: (lines: CnGrnLine[]) => void;
}

/**
 * Dialog เลือกรายการจาก GRN อ้างอิง — list บรรทัดที่รับเข้า (product+location)
 * แบบ multi-select checkbox แล้วส่งกลับให้ parent prepend เป็น CN item
 * (pre-fill price/tax/unit/qty จาก GRN) แทนการเลือก inline ในตาราง
 */
export function CnAddItemDialog({
  open,
  onOpenChange,
  grnId,
  existingKeys,
  onAdd,
}: Props) {
  const t = useTranslations("procurement.creditNote");
  const tc = useTranslations("common");

  const { data: grn, isLoading, error } = useGoodsReceiveNoteById(grnId);

  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const closeAndReset = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearch("");
      setPicked(new Set());
    }
    onOpenChange(nextOpen);
  };

  const allLines = useMemo(() => toLines(grn), [grn]);
  const lines = filterLines(allLines, search.trim());

  const togglePick = (key: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAdd = () => {
    onAdd(allLines.filter((l) => picked.has(l.key)));
    closeAndReset(false);
  };

  const pickedCount = picked.size;

  return (
    <Dialog open={open} onOpenChange={closeAndReset}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-1 text-base">
            <PackagePlus aria-hidden="true" />
            {t("selectFromGrn")}
          </DialogTitle>
          <DialogDescription>{t("selectFromGrnDesc")}</DialogDescription>
        </DialogHeader>

        <div className="px-6 py-3">
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
        </div>

        <ScrollArea className="min-h-80 flex-1 border-y">
          {error && (
            <p className="text-destructive p-3 text-xs">
              {error instanceof Error ? error.message : String(error)}
            </p>
          )}
          {isLoading && (
            <div className="space-y-2 p-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          )}
          {!isLoading && !error && lines.length === 0 && (
            <div className="py-10">
              <EmptyComponent
                title={t("noGrnItems")}
                description={t("noGrnItemsDesc")}
              />
            </div>
          )}
          {!isLoading && !error && lines.length > 0 && (
            <div className="divide-y">
              {lines.map((line) => {
                const isExisting = existingKeys.has(line.dedupeKey);
                const isPicked = picked.has(line.key);
                const id = `cn-add-${line.key}`;
                return (
                  <div
                    key={line.key}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-xs",
                      isExisting && "opacity-60",
                    )}
                  >
                    <Checkbox
                      id={id}
                      checked={isExisting ? true : isPicked}
                      disabled={isExisting}
                      onCheckedChange={() => togglePick(line.key)}
                    />
                    <label
                      htmlFor={id}
                      className={cn(
                        "flex min-w-0 flex-1 flex-col",
                        !isExisting && "cursor-pointer",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className="truncate font-semibold">
                          {line.product_name}
                        </span>
                        {isExisting && (
                          <Badge variant="secondary" size="xs">
                            {t("alreadyAdded")}
                          </Badge>
                        )}
                      </span>
                      <span className="text-muted-foreground truncate text-[0.6875rem]">
                        {line.location_name}
                        {line.location_code ? ` · ${line.location_code}` : ""}
                      </span>
                    </label>
                    <span className="text-muted-foreground w-16 shrink-0 text-right tabular-nums">
                      {line.quantity}
                      {line.unit_name ? ` ${line.unit_name}` : ""}
                    </span>
                    <span className="text-foreground/80 w-20 shrink-0 text-right tabular-nums">
                      {formatCurrency(line.unit_price)}
                    </span>
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
