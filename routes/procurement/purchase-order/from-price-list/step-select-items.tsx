
import { useState } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { PackagePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import EmptyComponent from "@/components/empty-component";
import { formatDate } from "@/lib/date-utils";
import { round2 } from "@/lib/currency-utils";
import { useCurrency } from "@/hooks/use-currency";
import type { PriceListDetailItem } from "@/types/price-list";
import {
  WIZARD_ITEM_TEMPLATE,
  type FromPriceListFormValues,
  type FromPriceListItemLocation,
  type FromPriceListSelectedItem,
} from "./from-price-list-form-schema";
import { BrowseDialog } from "./step-select-items-browse-dialog";
import { ProductCard } from "./step-select-items-product-card";

interface StepSelectItemsProps {
  readonly form: UseFormReturn<FromPriceListFormValues>;
}

const EMPTY_LOCATION: FromPriceListItemLocation = {
  id: "",
  order_qty: 1,
  received_qty: 0,
};

function detailToItem(detail: PriceListDetailItem): FromPriceListSelectedItem {
  const qty = detail.moq_qty || 1;
  const subTotal = round2(qty * detail.price);
  const taxAmt = round2((subTotal * (detail.tax_rate ?? 0)) / 100);
  return {
    ...WIZARD_ITEM_TEMPLATE,
    product_id: detail.product_id,
    product_code: detail.product_code ?? "",
    product_name: detail.product_name,
    product_local_name: detail.product_local_name,
    product_sku: detail.product_sku ?? "",
    order_unit_id: detail.unit_id,
    order_unit_name: detail.unit_name ?? "",
    order_unit_conversion_factor: 1,
    order_qty: qty,
    base_unit_id: detail.unit_id,
    base_unit_name: detail.unit_name ?? "",
    base_qty: qty,
    price: detail.price,
    sub_total_price: subTotal,
    net_amount: subTotal,
    total_price: subTotal + taxAmt,
    tax_profile_id: detail.tax_profile_id,
    tax_profile_name: detail.tax_profile_name ?? "",
    tax_rate: detail.tax_rate ?? 0,
    tax_amount: taxAmt,
    locations: [{ ...EMPTY_LOCATION, order_qty: qty }],
  };
}

export function StepSelectItems({ form }: StepSelectItemsProps) {
  const t = useTranslations("procurement.purchaseOrder");
  const tfl = useTranslations("field");

  const vendorId = useWatch({ control: form.control, name: "vendor_id" });
  const deliveryDate = useWatch({
    control: form.control,
    name: "delivery_date",
  });
  const itemsRaw = useWatch({ control: form.control, name: "items" });
  const items = (itemsRaw ?? []) as FromPriceListSelectedItem[];
  const itemsError = form.formState.errors.items;
  const itemsErrorMessage =
    typeof itemsError?.message === "string" ? itemsError.message : undefined;

  const apiDate = deliveryDate
    ? formatDate(deliveryDate, "yyyy-MM-dd")
    : undefined;

  const [browseOpen, setBrowseOpen] = useState(false);

  // Resolve the picked price-list currency's exchange_rate the same way the
  // manual PO form does (LookupCurrency uses perpage: 30). The BrowseDialog
  // currency object only carries {id, code, name}, so without this lookup a
  // foreign-currency PO would submit with the EMPTY_FORM default exchange_rate 1.
  const { data: currencyData } = useCurrency({ perpage: 30 });
  const currencies = currencyData?.data ?? [];

  const existingProductIds = new Set(
    items.map((i) => i.product_id ?? "").filter((id): id is string => !!id),
  );

  const totalProducts = items.length;
  const totalAmount = items.reduce((sum, item) => {
    const qty = item.locations.reduce(
      (q, l) => q + (Number(l.order_qty) || 0),
      0,
    );
    return sum + round2(qty * item.price);
  }, 0);

  const setItems = (next: FromPriceListSelectedItem[]) => {
    form.setValue("items", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleAddPicks = (
    details: PriceListDetailItem[],
    currency: { id: string; code: string; name: string } | null,
  ) => {
    const current = (form.getValues("items") ??
      []) as FromPriceListSelectedItem[];
    const existing = new Set(current.map((i) => i.product_id ?? ""));
    const toAdd = details
      .filter((d) => !existing.has(d.product_id))
      .map(detailToItem);
    if (toAdd.length === 0) return;
    setItems([...current, ...toAdd]);
    // Set currency จาก PL ที่ pick (ถ้ายังไม่เคย set) — PL ของ vendor
    // เดียวกันปกติใช้ currency เดียวกัน ใช้ตัวแรกที่เจอ
    if (currency && !form.getValues("currency_id")) {
      form.setValue("currency_id", currency.id, { shouldDirty: true });
      form.setValue("currency_code", currency.code, { shouldDirty: true });
      const rate = currencies.find((c) => c.id === currency.id)?.exchange_rate;
      if (rate != null) {
        form.setValue("exchange_rate", rate, { shouldDirty: true });
      }
    }
  };

  const handleRemoveItem = (productId: string) => {
    const current = (form.getValues("items") ??
      []) as FromPriceListSelectedItem[];
    const next = current.filter((i) => (i.product_id ?? "") !== productId);
    setItems(next);
    // Reset currency เมื่อไม่เหลือ item เพื่อให้รอบหน้า pick ใหม่ get
    // currency จาก PL ที่ใหม่
    if (next.length === 0) {
      form.setValue("currency_id", "", { shouldDirty: true });
      form.setValue("currency_code", "", { shouldDirty: true });
      form.setValue("exchange_rate", 1, { shouldDirty: true });
    }
  };

  const handleAddLocation = (productId: string) => {
    const current = (form.getValues("items") ??
      []) as FromPriceListSelectedItem[];
    const idx = current.findIndex((i) => (i.product_id ?? "") === productId);
    if (idx < 0) return;
    const next = [...current];
    next[idx] = {
      ...next[idx],
      locations: [...next[idx].locations, { ...EMPTY_LOCATION }],
    };
    setItems(next);
  };

  const handleRemoveLocation = (productId: string, locIndex: number) => {
    const current = (form.getValues("items") ??
      []) as FromPriceListSelectedItem[];
    const idx = current.findIndex((i) => (i.product_id ?? "") === productId);
    if (idx < 0) return;
    const item = current[idx];
    if (item.locations.length <= 1) return;
    const next = [...current];
    next[idx] = {
      ...item,
      locations: item.locations.filter((_, i) => i !== locIndex),
    };
    setItems(next);
  };

  const handleLocationChange = (
    productId: string,
    locIndex: number,
    patch: Partial<FromPriceListItemLocation>,
  ) => {
    const current = (form.getValues("items") ??
      []) as FromPriceListSelectedItem[];
    const idx = current.findIndex((i) => (i.product_id ?? "") === productId);
    if (idx < 0) return;
    const item = current[idx];
    const nextLocations = [...item.locations];
    nextLocations[locIndex] = { ...nextLocations[locIndex], ...patch };
    const next = [...current];
    next[idx] = { ...item, locations: nextLocations };
    setItems(next);
  };

  return (
    <Field>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FieldLabel required>{tfl("product")}</FieldLabel>
        <div className="flex items-center gap-2">
          <Badge variant={totalProducts > 0 ? "default" : "secondary"}>
            {t("nProductsSelected", { count: totalProducts })}
          </Badge>
          {totalAmount > 0 && (
            <Badge variant="secondary">
              {tfl("total")}: {totalAmount.toLocaleString()}
            </Badge>
          )}
          <Button
            type="button"
            size="sm"
            className="bg-module-procurement"
            onClick={() => setBrowseOpen(true)}
            disabled={!vendorId || !apiDate}
          >
            <PackagePlus className="size-3.5" aria-hidden="true" />
            {t("browseFromPriceList")}
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed py-10">
          <EmptyComponent
            title={t("noProductsSelected")}
            description={t("noProductsSelectedDesc")}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <ProductCard
              key={item.product_id ?? `item-${index}`}
              item={item}
              errors={
                Array.isArray(itemsError)
                  ? (itemsError[index] as ProductCardError)
                  : undefined
              }
              onRemoveItem={handleRemoveItem}
              onAddLocation={handleAddLocation}
              onRemoveLocation={handleRemoveLocation}
              onLocationChange={handleLocationChange}
            />
          ))}
        </div>
      )}

      {itemsErrorMessage && <FieldError>{itemsErrorMessage}</FieldError>}

      <BrowseDialog
        open={browseOpen}
        onOpenChange={setBrowseOpen}
        vendorId={vendorId}
        apiDate={apiDate}
        existingProductIds={existingProductIds}
        onAdd={handleAddPicks}
      />
    </Field>
  );
}

type ProductCardError = {
  locations?:
    | Array<
        | {
            id?: { message?: string };
            order_qty?: { message?: string };
          }
        | undefined
      >
    | { message?: string };
};
