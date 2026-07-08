import { useState } from "react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  ClipboardList,
  Loader2,
  Store,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import EmptyComponent from "@/components/empty-component";
import { cn } from "@/lib/utils";
import { GRN_PO_STATUS_CONFIG } from "@/constant/goods-receive-note";
import {
  usePurchaseOrderGrnVendors,
  usePurchaseOrderForGrnByVendor,
} from "@/hooks/use-purchase-order";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/currency-utils";
import type { VendorForGrn, PoForGrn } from "@/types/purchase-order";
import SearchInput from "@/components/search-input";

interface GrnPoWizardDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onComplete: (data: {
    vendorId: string;
    vendorName: string;
    currencyId: string;
    currencyCode: string;
    exchangeRate: number;
    poList: PoForGrn[];
  }) => void;
}

/**
 * Wizard 2 ขั้นตอนสำหรับสร้าง GRN จาก PO — Apple-style flat list design
 *
 * chrome ถูกลดให้เหลือน้อยที่สุด: progress rail บาง + title นำ + hairline list
 * (ไม่ใช้ card grid / ring glow). ขั้นที่ 1 เลือก vendor, ขั้นที่ 2 เลือก PO + detail.
 * แต่ละ step คุม scroll region + footer ของตัวเอง (footer pin ด้วย flex column)
 * เมื่อเลือกเสร็จ onComplete จะได้ข้อมูล vendor + currency + exchange rate + poList
 */
export function GrnPoWizardDialog({
  open,
  onOpenChange,
  onComplete,
}: GrnPoWizardDialogProps) {
  const t = useTranslations("procurement.goodsReceiveNote");
  const tc = useTranslations("common");

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedVendor, setSelectedVendor] = useState<VendorForGrn | null>(
    null,
  );
  const [vendorSearch, setVendorSearch] = useState("");

  const handleSelectVendor = (vendor: VendorForGrn) => {
    setSelectedVendor(vendor);
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setSelectedVendor(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[70vw]!">
        <div className="shrink-0 space-y-3 px-6 pt-12 pb-4">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="bg-primary h-0.75 flex-1 rounded-full" />
            <span
              className={cn(
                "h-0.75 flex-1 rounded-full",
                step === 2 ? "bg-primary" : "bg-border",
              )}
            />
          </div>
          <DialogHeader>
            <DialogTitle className="text-base">
              {step === 1 ? t("wizardVendorTitle") : t("wizardPoTitle")}
            </DialogTitle>
            <DialogDescription>
              {step === 1 || !selectedVendor ? (
                step === 1 ? (
                  t("wizardVendorDesc")
                ) : (
                  t("wizardPoDesc")
                )
              ) : (
                <span className="inline-flex flex-wrap items-center gap-x-1.5">
                  <span className="text-foreground font-medium">
                    {selectedVendor.vendor_name}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedVendor.vendor_code}</span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-primary hover:underline"
                  >
                    {tc("change")}
                  </button>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        {step === 1 && (
          <VendorStep
            search={vendorSearch}
            onSearchChange={setVendorSearch}
            onSelect={handleSelectVendor}
            onCancel={() => onOpenChange(false)}
          />
        )}
        {step === 2 && selectedVendor && (
          <PoStep
            vendor={selectedVendor}
            onBack={handleBack}
            onComplete={onComplete}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Select Vendor (hairline-divided list)
// ---------------------------------------------------------------------------

function VendorStep({
  search,
  onSearchChange,
  onSelect,
  onCancel,
}: {
  readonly search: string;
  readonly onSearchChange: (v: string) => void;
  readonly onSelect: (vendor: VendorForGrn) => void;
  readonly onCancel: () => void;
}) {
  const t = useTranslations("procurement.goodsReceiveNote");
  const tc = useTranslations("common");
  const { data, isLoading } = usePurchaseOrderGrnVendors();

  const vendors = (() => {
    const all = data ?? [];
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter(
      (v) =>
        v.vendor_name.toLowerCase().includes(q) ||
        v.vendor_code.toLowerCase().includes(q),
    );
  })();

  if (isLoading) {
    return (
      <div className="flex min-h-60 flex-1 items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-6 pb-3">
        <SearchInput defaultValue={search} onSearch={onSearchChange} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {vendors.length === 0 ? (
          <div className="px-6 py-8">
            <EmptyComponent
              icon={Store}
              title={t("noVendor")}
              description={t("noVendorDesc")}
            />
          </div>
        ) : (
          <div className="divide-y border-t">
            {vendors.map((vendor) => (
              <button
                key={vendor.vendor_id}
                type="button"
                onClick={() => onSelect(vendor)}
                className="group hover:bg-muted/40 focus-visible:bg-muted/40 flex w-full cursor-pointer items-center gap-3 px-6 py-3 text-left transition-colors focus:outline-none"
              >
                <Building2 className="text-muted-foreground size-4.5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="text-foreground block truncate text-xs font-medium">
                    {vendor.vendor_name}{" "}
                    <Badge variant={"outline"} size={"xs"}>
                      {vendor.vendor_code}
                    </Badge>
                  </span>
                </span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {t("poCount", { count: vendor.po_count })}
                </span>
                <ChevronRight
                  className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-colors"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center border-t px-6 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-muted-foreground"
        >
          {tc("cancel")}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Select POs (grouped list: PO header + indented item rows)
// ---------------------------------------------------------------------------

function PoStep({
  vendor,
  onBack,
  onComplete,
}: {
  readonly vendor: VendorForGrn;
  readonly onBack: () => void;
  readonly onComplete: GrnPoWizardDialogProps["onComplete"];
}) {
  const t = useTranslations("procurement.goodsReceiveNote");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const { dateFormat } = useProfile();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data, isLoading } = usePurchaseOrderForGrnByVendor(vendor.vendor_id);

  const poList = data?.data ?? [];

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

  const getPoChecked = (po: PoForGrn) => {
    const ids = po.po_detail.map((d) => d.id);
    const count = ids.filter((id) => selected.has(id)).length;
    if (count === 0) return false;
    if (count === ids.length) return true;
    return "indeterminate" as const;
  };

  const handleConfirm = () => {
    const result: PoForGrn[] = [];
    for (const po of poList) {
      const selectedDetails = po.po_detail.filter((d) => selected.has(d.id));
      if (selectedDetails.length > 0) {
        result.push({ ...po, po_detail: selectedDetails });
      }
    }
    if (result.length === 0) return;

    const firstPo = result[0];
    // กัน PO ต่างสกุลเงินถูกยัดเข้า GRN เดียวด้วย exchange rate ของ PO แรก (silent error)
    if (result.some((po) => po.currency_id !== firstPo.currency_id)) {
      toast.error(t("mixedCurrencyError"));
      return;
    }
    onComplete({
      vendorId: vendor.vendor_id,
      vendorName: vendor.vendor_name,
      currencyId: firstPo.currency_id,
      currencyCode: firstPo.currency_code,
      exchangeRate: firstPo.exchange_rate,
      poList: result,
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-60 flex-1 items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  if (poList.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 px-6 py-12">
          <EmptyComponent
            icon={ClipboardList}
            title={t("noPo")}
            description={t("noPoDesc")}
          />
        </div>
        <div className="flex shrink-0 items-center border-t px-6 py-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
            {tc("back")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <label className="hover:bg-muted/40 flex shrink-0 cursor-pointer items-center gap-2.5 border-t px-6 py-2.5 transition-colors">
        <Checkbox
          checked={
            isAllSelected || (isSomeSelected && "indeterminate") || false
          }
          onCheckedChange={toggleAll}
        />
        <span className="text-foreground text-xs font-medium">
          {tfl("selectAll")}
        </span>
        <span className="text-muted-foreground text-[0.6875rem]">
          {poList.length} PO · {allDetailIds.length} items
        </span>
        {selectedCount > 0 && (
          <Badge
            variant="primary-light"
            size="xs"
            className="ml-auto tabular-nums"
          >
            {t("nSelected", { count: selectedCount })}
          </Badge>
        )}
      </label>

      <div className="min-h-0 flex-1 overflow-y-auto border-t">
        {poList.map((po) => {
          const checked = getPoChecked(po);
          return (
            <div key={po.id} className="border-b last:border-b-0">
              <label className="bg-muted/30 flex cursor-pointer items-center gap-2.5 px-6 py-2">
                <Checkbox
                  checked={checked}
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
                <span className="text-muted-foreground text-[0.6875rem]">
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
                const detailChecked = selected.has(d.id);
                return (
                  <label
                    key={d.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 border-t py-2 pr-6 pl-12 transition-colors",
                      detailChecked ? "bg-primary/5" : "hover:bg-muted/20",
                    )}
                  >
                    <Checkbox
                      checked={detailChecked}
                      onCheckedChange={() => toggleDetail(d.id)}
                    />
                    <span className="text-muted-foreground shrink-0 text-[0.6875rem] tabular-nums">
                      {d.product_code}
                    </span>
                    <span className="text-foreground min-w-0 flex-1 truncate text-xs">
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
          );
        })}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t px-6 py-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          {tc("back")}
        </Button>
        <Button
          size="sm"
          disabled={selectedCount === 0}
          onClick={handleConfirm}
        >
          {tc("confirm")}
        </Button>
      </div>
    </div>
  );
}
