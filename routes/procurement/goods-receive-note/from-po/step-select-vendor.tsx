import { useState } from "react";
import { useTranslations } from "use-intl";
import { Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyComponent from "@/components/empty-component";
import SearchInput from "@/components/search-input";
import { cn } from "@/lib/utils";
import { usePurchaseOrderGrnVendors } from "../../shared/use-purchase-order";
import type { VendorForGrn } from "@/types/purchase-order";

interface StepSelectVendorProps {
  readonly vendorId: string;
  readonly onSelect: (vendor: VendorForGrn) => void;
}

/**
 * เลือกผู้ขายที่จะรับของ — เลือกได้รายเดียว จึงเป็น RadioGroup ไม่ใช่ลิสต์ปุ่ม
 * (ท่าเดียวกับขั้นเลือกผู้ขายของ wizard รายการราคาฝั่งใบสั่งซื้อ)
 */
export function StepSelectVendor({
  vendorId,
  onSelect,
}: StepSelectVendorProps) {
  const t = useTranslations("procurement.goodsReceiveNote");
  const [search, setSearch] = useState("");
  const { data, isLoading } = usePurchaseOrderGrnVendors();

  // กรองในฝั่ง client จากรายชื่อที่โหลดมาแล้ว — onInputChange กรองทันทีที่พิมพ์
  // ไม่ใช่ onSearch ที่รอ Enter (กติกา Enter-to-search มีไว้กันการยิง API รัว ๆ
  // ซึ่งไม่เกี่ยวกับที่นี่) · onSearch ต่อไว้ด้วยเพื่อให้ปุ่มล้างในช่องทำงาน
  const q = search.trim().toLowerCase();
  const vendors = (data ?? []).filter(
    (v) =>
      !q ||
      v.vendor_name.toLowerCase().includes(q) ||
      v.vendor_code.toLowerCase().includes(q),
  );

  return (
    <div className="space-y-3">
      <SearchInput
        defaultValue={search}
        onSearch={setSearch}
        onInputChange={setSearch}
        containerClassName="w-96 max-w-full"
        inputClassName="h-8 text-xs placeholder:text-xs"
      />

      <ScrollArea className="h-96 rounded-md border">
        {isLoading && (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        )}

        {!isLoading && vendors.length === 0 && (
          <div className="py-10">
            <EmptyComponent
              icon={Store}
              title={t("noVendor")}
              description={t("noVendorDesc")}
            />
          </div>
        )}

        {!isLoading && vendors.length > 0 && (
          <RadioGroup
            value={vendorId}
            onValueChange={(id) => {
              const vendor = vendors.find((v) => v.vendor_id === id);
              if (vendor) onSelect(vendor);
            }}
            className="gap-0 divide-y"
          >
            {vendors.map((vendor) => (
              <Label
                key={vendor.vendor_id}
                htmlFor={`grn-vendor-${vendor.vendor_id}`}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-normal transition-colors",
                  vendor.vendor_id === vendorId
                    ? "bg-primary/5 hover:bg-primary/10"
                    : "hover:bg-accent",
                )}
              >
                <RadioGroupItem
                  value={vendor.vendor_id}
                  id={`grn-vendor-${vendor.vendor_id}`}
                />
                <Badge variant="outline">{vendor.vendor_code}</Badge>
                <span className="font-semibold">{vendor.vendor_name}</span>
                <span className="text-muted-foreground ms-auto">
                  {t("poCount", { count: vendor.po_count })}
                </span>
              </Label>
            ))}
          </RadioGroup>
        )}
      </ScrollArea>
    </div>
  );
}
