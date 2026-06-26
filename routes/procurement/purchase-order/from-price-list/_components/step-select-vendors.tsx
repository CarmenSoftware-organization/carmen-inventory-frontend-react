
import { useState } from "react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { CalendarDays, Check, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyComponent from "@/components/empty-component";
import { cn } from "@/lib/utils";
import { usePriceListActiveVendors } from "@/hooks/use-price-list";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import type { FromPriceListFormValues } from "../from-price-list-form-schema";

interface StepSelectVendorsProps {
  readonly form: UseFormReturn<FromPriceListFormValues>;
}

/**
 * Step 2 ของ PO from-price-list wizard — เลือก vendor 1 ราย
 *
 * อ่าน `delivery_date` จาก form, แปลงเป็น `yyyy-MM-dd` แล้ว fetch active
 * vendors ของวันนั้นผ่าน `usePriceListActiveVendors`. แสดงเป็น list ของ
 * row-button (single-select) — กดเลือก row ใด row นั้นถูก highlight + check
 *
 * @param props.form - RHF instance ของ wizard
 * @returns JSX
 */
export function StepSelectVendors({ form }: StepSelectVendorsProps) {
  const t = useTranslations("procurement.purchaseOrder");
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const { dateFormat } = useProfile();

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
        const selectedVendor = vendors.find((v) => v.id === selectedId);

        return (
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel required>{tfl("vendor")}</FieldLabel>
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <CalendarDays className="size-3" aria-hidden="true" />
                {deliveryDate ? formatDate(deliveryDate, dateFormat) : "—"}
              </div>
            </div>

            <div className="relative">
              <Search
                aria-hidden="true"
                className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchVendor")}
                className="h-8 pl-8 text-xs"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {selectedVendor ? (
                  <Badge variant="secondary" size="xs">
                    {selectedVendor.code} · {selectedVendor.name}
                  </Badge>
                ) : (
                  t("noVendorSelected")
                )}
              </span>
              {selectedId && (
                <button
                  type="button"
                  onClick={() => {
                    field.onChange("");
                    form.setValue("vendor_name", "");
                  }}
                  className="text-muted-foreground hover:text-foreground text-[0.6875rem] font-semibold"
                >
                  {tc("clear")}
                </button>
              )}
            </div>

            <ScrollArea className="h-72 rounded-md border">
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
              {!isLoading && !error && filteredVendors.length === 0 && (
                <div className="py-6">
                  <EmptyComponent
                    title={t("noVendorsAvailable")}
                    description={t("noVendorsAvailableDesc")}
                  />
                </div>
              )}
              {!isLoading && !error && filteredVendors.length > 0 && (
                <div className="divide-y">
                  {filteredVendors.map((vendor) => {
                    const isSelected = vendor.id === selectedId;
                    return (
                      <button
                        key={vendor.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          field.onChange(vendor.id);
                          form.setValue("vendor_name", vendor.name);
                          // clear error ทันทีเมื่อเลือก (wizard ไม่ผ่าน
                          // handleSubmit → reValidateMode ไม่ทำงานเอง)
                          if (fieldState.error) form.trigger("vendor_id");
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
                          "focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
                          isSelected
                            ? "bg-primary/5 hover:bg-primary/10"
                            : "hover:bg-accent",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center rounded-full border",
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/30",
                          )}
                          aria-hidden="true"
                        >
                          {isSelected && <Check className="size-3" />}
                        </span>
                        <span className="text-muted-foreground">
                          {vendor.code}
                        </span>
                        <span className="flex-1 font-semibold">
                          {vendor.name}
                        </span>
                        {!vendor.is_active && (
                          <Badge variant="secondary" size="xs">
                            {tc("inactive")}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
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
