import { useState } from "react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyComponent from "@/components/empty-component";
import SearchInput from "@/components/search-input";
import { cn } from "@/lib/utils";
import { usePriceListActiveVendors } from "@/hooks/use-price-list";
import { formatDate } from "@/lib/date-utils";
import type { FromPriceListFormValues } from "./from-price-list-form-schema";

interface StepSelectVendorsProps {
  readonly form: UseFormReturn<FromPriceListFormValues>;
}

export function StepSelectVendors({ form }: StepSelectVendorsProps) {
  const t = useTranslations("procurement.purchaseOrder");
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const deliveryDate = useWatch({
    control: form.control,
    name: "delivery_date",
  });

  const apiDate = deliveryDate
    ? formatDate(deliveryDate, "yyyy-MM-dd")
    : undefined;

  const {
    data: vendors = [],
    isLoading,
    error,
  } = usePriceListActiveVendors(apiDate);

  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const filteredVendors = q
    ? vendors.filter(
        (v) =>
          v.code.toLowerCase().includes(q) || v.name.toLowerCase().includes(q),
      )
    : vendors;

  return (
    <Controller
      control={form.control}
      name="vendor_id"
      render={({ field, fieldState }) => {
        const selectedId = field.value;

        return (
          <Field>
            <FieldLabel required>{tfl("vendor")}</FieldLabel>
            <SearchInput
              defaultValue={search}
              onSearch={setSearch}
              onInputChange={setSearch}
              placeholder={t("searchVendor")}
              containerClassName="w-96 mb-2"
            />

            <ScrollArea className="h-52 max-h-52 rounded-md border">
              {error && (
                <p className="text-destructive p-3 text-xs">
                  {error instanceof Error ? error.message : String(error)}
                </p>
              )}
              {isLoading && (
                <div className="space-y-2 p-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              )}
              {!apiDate && (
                <div className="py-6">
                  <EmptyComponent
                    icon={CalendarDays}
                    title={t("pickDeliveryDateFirst")}
                    description={t("pickDeliveryDateFirstDesc")}
                  />
                </div>
              )}
              {!!apiDate &&
                !isLoading &&
                !error &&
                filteredVendors.length === 0 && (
                  <div className="py-6">
                    <EmptyComponent
                      title={t("noVendorsAvailable")}
                      description={t("noVendorsAvailableDesc")}
                    />
                  </div>
                )}
              {!isLoading && !error && filteredVendors.length > 0 && (
                <RadioGroup
                  value={selectedId ?? ""}
                  onValueChange={(id) => {
                    const vendor = vendors.find((v) => v.id === id);
                    field.onChange(id);
                    form.setValue("vendor_name", vendor?.name ?? "");
                    if (fieldState.error) form.trigger("vendor_id");
                  }}
                  className="gap-0 divide-y"
                >
                  {filteredVendors.map((vendor) => (
                    <Label
                      key={vendor.id}
                      htmlFor={`vendor-${vendor.id}`}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-normal transition-colors",
                        vendor.id === selectedId
                          ? "bg-primary/5 hover:bg-primary/10"
                          : "hover:bg-accent",
                      )}
                    >
                      <RadioGroupItem
                        value={vendor.id}
                        id={`vendor-${vendor.id}`}
                      />
                      <Badge variant={"outline"}>{vendor.code}</Badge>
                      <span className="font-semibold">{vendor.name}</span>
                      {!vendor.is_active && (
                        <Badge variant="secondary" size="xs">
                          {tc("inactive")}
                        </Badge>
                      )}
                    </Label>
                  ))}
                </RadioGroup>
              )}
            </ScrollArea>

            {fieldState.error?.message && (
              <FieldError>{fieldState.error.message}</FieldError>
            )}
          </Field>
        );
      }}
    />
  );
}
