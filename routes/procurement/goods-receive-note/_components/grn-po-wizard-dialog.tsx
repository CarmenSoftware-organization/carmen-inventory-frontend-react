
import { useState } from "react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ClipboardCheck,
  ClipboardList,
  Loader2,
  Package,
  PackageCheck,
  Search,
  Store,
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
import { Input } from "@/components/ui/input";
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
 * Wizard 2 ขั้นตอนสำหรับสร้าง GRN จาก PO — premium ERP design
 *
 * ขั้นที่ 1 เลือก vendor (ที่มี PO พร้อมรับ), ขั้นที่ 2 เลือก PO + product detail
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
      <DialogContent className="flex flex-col gap-0 p-0 pt-2 sm:max-w-[70vw]!">
        <div className="relative space-y-4 px-6 pt-6 pb-4">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                <PackageCheck className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="bg-primary/10 text-primary mb-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-medium">
                  {t("entity")}
                </div>
                <DialogTitle className="text-base">
                  {step === 1 ? t("wizardVendorTitle") : t("wizardPoTitle")}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {step === 1 ? t("wizardVendorDesc") : t("wizardPoDesc")}
                </DialogDescription>
                {step === 2 && selectedVendor && (
                  <div className="bg-muted/40 mt-2 inline-flex items-center gap-2 rounded-md border px-2 py-1">
                    <Building2 className="text-muted-foreground size-3.5" />
                    <Badge
                      variant="outline"
                      size="xs"
                      className="text-[0.625rem]"
                    >
                      {selectedVendor.vendor_code}
                    </Badge>
                    <span className="text-xs font-medium">
                      {selectedVendor.vendor_name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>

          <StepIndicator currentStep={step} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-6 pb-4">
          {step === 1 && (
            <VendorStep
              search={vendorSearch}
              onSearchChange={setVendorSearch}
              onSelect={handleSelectVendor}
            />
          )}
          {step === 2 && selectedVendor && (
            <PoStep vendor={selectedVendor} onComplete={onComplete} />
          )}
        </div>

        <DialogFooter className="bg-muted/20 items-center border-t px-6 py-3 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground"
          >
            {tc("cancel")}
          </Button>
          {step === 2 && (
            <Button variant="outline" size="sm" onClick={handleBack}>
              <ArrowLeft aria-hidden="true" />
              {tc("back")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

const StepIndicator = ({ currentStep }: { currentStep: 1 | 2 }) => {
  const t = useTranslations("procurement.goodsReceiveNote");
  const steps = [
    { step: 1, label: t("stepSelectVendor") },
    { step: 2, label: t("stepSelectPo") },
  ];

  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i, arr) => {
        const isCompleted = s.step < currentStep;
        const isCurrent = s.step === currentStep;
        return (
          <div key={s.step} className="flex flex-1 items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-semibold transition-colors",
                  isCompleted && "bg-success text-white",
                  isCurrent &&
                    "bg-primary text-primary-foreground ring-primary/20 ring-4",
                  !isCompleted &&
                    !isCurrent &&
                    "bg-muted text-muted-foreground",
                )}
              >
                {isCompleted ? <Check className="size-3" /> : s.step}
              </div>
              <span
                className={cn(
                  "text-[0.625rem] font-medium whitespace-nowrap",
                  isCurrent && "text-foreground",
                  !isCurrent && "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </div>
            {i < arr.length - 1 && (
              <div
                className={cn(
                  "mb-4 h-px flex-1",
                  isCompleted ? "bg-success" : "bg-border",
                )}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Step 1 — Select Vendor (card grid)
// ---------------------------------------------------------------------------

function VendorStep({
  search,
  onSearchChange,
  onSelect,
}: {
  readonly search: string;
  readonly onSearchChange: (v: string) => void;
  readonly onSelect: (vendor: VendorForGrn) => void;
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-hidden">
      <div>
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder={tc("search")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-9 text-sm"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {vendors.length === 0 ? (
          <div className="py-8">
            <EmptyComponent
              icon={Store}
              title={t("noVendor")}
              description={t("noVendorDesc")}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.map((vendor) => (
              <button
                key={vendor.vendor_id}
                type="button"
                onClick={() => onSelect(vendor)}
                className="group hover:border-primary/40 bg-card focus-visible:ring-primary/40 relative flex cursor-pointer items-start gap-3 overflow-hidden rounded-xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2"
              >
                <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Building2 className="size-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <Badge
                    variant="outline"
                    size="xs"
                    className="text-[0.625rem]"
                  >
                    {vendor.vendor_code}
                  </Badge>
                  <p className="truncate text-sm font-semibold">
                    {vendor.vendor_name}
                  </p>
                  <p className="text-muted-foreground inline-flex items-center gap-1 text-[0.6875rem]">
                    <ClipboardList className="size-3" />
                    {t("poCount", { count: vendor.po_count })}
                  </p>
                </div>
                <ArrowRight
                  className="text-muted-foreground group-hover:text-primary mt-1 size-4 shrink-0 transition-all group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Select POs with tree-style product rows
// ---------------------------------------------------------------------------

function PoStep({
  vendor,
  onComplete,
}: {
  readonly vendor: VendorForGrn;
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  if (poList.length === 0) {
    return (
      <div className="py-12">
        <EmptyComponent
          icon={ClipboardList}
          title={t("noPo")}
          description={t("noPoDesc")}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-hidden">
      <label className="hover:bg-muted/40 flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 transition-colors">
        <Checkbox
          checked={
            isAllSelected || (isSomeSelected && "indeterminate") || false
          }
          onCheckedChange={toggleAll}
        />
        <span className="text-xs font-medium">{tfl("selectAll")}</span>
        <span className="text-muted-foreground text-[0.6875rem]">
          · {poList.length} PO · {allDetailIds.length} items
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

      <div className="flex-1 space-y-2 overflow-y-auto">
        {poList.map((po) => {
          const checked = getPoChecked(po);
          const isHighlighted = checked === true || checked === "indeterminate";
          return (
            <div
              key={po.id}
              className={`overflow-hidden rounded-xl border transition-all ${
                isHighlighted
                  ? "border-primary/40 bg-primary/5 ring-primary/20 ring-2"
                  : "hover:border-primary/30 bg-card"
              }`}
            >
              <label className="bg-muted/30 flex cursor-pointer items-center gap-2 border-b px-3 py-2.5">
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => togglePo(po)}
                />
                <div className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-md">
                  <ClipboardList className="size-3.5" />
                </div>
                <Badge variant="outline" size="xs" className="text-[0.625rem]">
                  {po.po_no}
                </Badge>
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
                <span className="text-muted-foreground flex items-center gap-1 text-[0.6875rem]">
                  <Package className="size-3" aria-hidden="true" />
                  {po.po_detail.length}
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

              <div className="py-1">
                {po.po_detail.map((d, dIdx) => {
                  const isLast = dIdx === po.po_detail.length - 1;
                  const detailChecked = selected.has(d.id);
                  return (
                    <label
                      key={d.id}
                      className={`flex cursor-pointer items-center gap-2 py-1.5 pr-3 transition-colors ${
                        detailChecked ? "bg-primary/5" : "hover:bg-muted/20"
                      }`}
                    >
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
                      <span className="w-24 shrink-0 text-right text-xs font-medium tabular-nums">
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

      <div className="flex items-center justify-end border-t pt-3">
        <Button
          size="default"
          disabled={selectedCount === 0}
          onClick={handleConfirm}
        >
          <ClipboardCheck aria-hidden="true" />
          {tc("confirm")}
        </Button>
      </div>
    </div>
  );
}
