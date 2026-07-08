import { X } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { LookupVendor } from "@/components/lookup/lookup-vendor";
import type { Vendor } from "@/types/vendor";

/** Inline add row shown under the vendor grid while picking a new vendor */
export function RfpVendorAddRow({
  selectedVendorIds,
  onCancel,
  onAddVendor,
}: {
  readonly selectedVendorIds: Set<string>;
  readonly onCancel: () => void;
  readonly onAddVendor: (vendor: Vendor) => void;
}) {
  const t = useTranslations("vendorManagement.requestPriceList");
  const tc = useTranslations("common");

  return (
    <div className="border-primary/40 bg-primary/5 mt-2 flex items-center gap-2 rounded-lg border border-dashed p-2">
      <LookupVendor
        value=""
        defaultLabel={undefined}
        disabled={false}
        onValueChange={() => {}}
        onItemChange={(vendor) => onAddVendor(vendor)}
        excludeIds={selectedVendorIds}
        placeholder={t("vendors.selectVendorToAdd")}
        className="h-8 w-full text-xs"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={tc("cancel")}
        onClick={onCancel}
        className="text-muted-foreground hover:text-destructive shrink-0 rounded-lg"
      >
        <X />
      </Button>
    </div>
  );
}
