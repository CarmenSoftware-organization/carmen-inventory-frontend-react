import { useTranslations } from "use-intl";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { MapPin, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getGrnDocTypeLabel } from "@/constant/grn-doc-type";
import type { GrnFormValues } from "./grn-form-schema";
import GrnTabDetails from "./grn-tab-details";
import GrnTabQty from "./grn-tab-qty";
import GrnTabPricing from "./grn-tab-pricing";

interface GrnItemDetailSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly index: number;
  readonly form: UseFormReturn<GrnFormValues>;
  readonly disabled: boolean;
  readonly groupIndices: number[];
}

export function GrnItemDetailSheet({
  open,
  onOpenChange,
  index,
  form,
  disabled,
  groupIndices,
}: GrnItemDetailSheetProps) {
  const tfl = useTranslations("field");

  const productName =
    useWatch({
      control: form.control,
      name: `items.${index}.product_name`,
    }) ?? "";
  const locationName =
    useWatch({
      control: form.control,
      name: `items.${index}.location_name`,
    }) ?? "";
  const locationCode =
    useWatch({
      control: form.control,
      name: `items.${index}.location_code`,
    }) ?? "";
  const locationType =
    useWatch({
      control: form.control,
      name: `items.${index}.location_type`,
    }) ?? "";
  const docType = useWatch({ control: form.control, name: "doc_type" }) ?? "";
  const docTypeLabel = getGrnDocTypeLabel(tfl, docType);
  const docTypeVariant = docType === "manual" ? "secondary" : "info";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader className="animate-fade-in-left space-y-1">
          <SheetTitle className="text-sm">
            <div className="flex items-center gap-2">
              <Package className="text-primary size-4 shrink-0" />
              <span className="truncate">{productName || tfl("product")}</span>
              <Badge
                variant={docTypeVariant}
                className="shrink-0 text-[0.625rem]"
              >
                {docTypeLabel}
              </Badge>
            </div>
          </SheetTitle>
          <SheetDescription className="flex items-center gap-1.5 text-xs">
            <MapPin className="size-3 shrink-0" />
            {locationCode && (
              <Badge size="xs" variant="secondary" className="shrink-0">
                {locationCode}
              </Badge>
            )}
            <span className="truncate">
              {locationName || tfl("newLocation")}
            </span>
            {locationType && (
              <Badge size="xs" className="shrink-0">
                {locationType.toUpperCase()}
              </Badge>
            )}
          </SheetDescription>
        </SheetHeader>

        <Separator className="animate-fade-in-left mx-4 [animation-delay:75ms]" />

        <Tabs
          defaultValue="details"
          className="animate-fade-in-left px-4 [animation-delay:150ms]"
        >
          <TabsList className="w-full">
            <TabsTrigger value="details" className="text-xs">
              {tfl("details")}
            </TabsTrigger>
            <TabsTrigger value="quantity" className="text-xs">
              {tfl("quantity")}
            </TabsTrigger>
            <TabsTrigger value="pricing" className="text-xs">
              {tfl("pricing")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <GrnTabDetails
              form={form}
              index={index}
              disabled={disabled}
              groupIndices={groupIndices}
            />
          </TabsContent>

          <TabsContent value="quantity">
            <GrnTabQty
              form={form}
              index={index}
              disabled={disabled}
              docType={docType}
            />
          </TabsContent>

          <TabsContent value="pricing">
            <GrnTabPricing form={form} index={index} disabled={disabled} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
