
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Package } from "lucide-react";
import { Field, FieldError } from "@/components/ui/field";
import {
  CardLabel,
  GlassCard,
} from "@/components/share/glass-card";
import type { ProductLocation } from "@/types/location";
import type { SpotCheckFormValues } from "./sc-form-schema";
import { ProductPanel, type DisplayItem } from "./sc-product-panel";

interface ScProductTransferProps {
  readonly form: UseFormReturn<SpotCheckFormValues>;
  readonly disabled: boolean;
  readonly isView?: boolean;
  readonly availableProducts: ProductLocation[];
}

/**
 * Multi-select 2-pane (Selected ซ้าย / Available ขวา) — direct toggle UX
 * - Click checkbox → push/pop product_id ใน form ทันที
 * - Header checkbox → toggle all visible (เคารพ search)
 * - Virtualized list (รองรับ 1000+ items)
 *
 * Form field: products: { product_id, product_name }[]
 * Payload (mapFormToPayload) → product_id: string[]
 */
export function ScProductTransfer({
  form,
  disabled,
  isView,
  availableProducts,
}: ScProductTransferProps) {
  const t = useTranslations("inventoryManagement.spotCheck");
  const tfl = useTranslations("field");

  // Dedup + build display list
  const seen = new Set<string>();
  const allItems: DisplayItem[] = [];
  for (const p of availableProducts) {
    if (!p.id || seen.has(p.id)) continue;
    seen.add(p.id);
    allItems.push({
      id: p.id,
      title:
        [p.code, p.name].filter(Boolean).join(" — ").trim() || p.id,
    });
  }

  const productsError = form.formState.errors.products;
  const productsErrorMsg =
    productsError &&
    typeof productsError === "object" &&
    "message" in productsError
      ? (productsError as { message?: string }).message
      : undefined;

  const isDisabled = disabled || !!isView;

  return (
    <GlassCard>
      <div className="flex items-center justify-between gap-2">
        <CardLabel>
          <span className="inline-flex items-center gap-1">
            <Package className="size-2.5" />
            {tfl("products")}
          </span>
        </CardLabel>
      </div>

      <Field data-invalid={!!productsError} className="mt-2">
        <Controller
          control={form.control}
          name="products"
          render={({ field }) => {
            const selectedIds = new Set(
              field.value
                .map((p) => p.product_id)
                .filter((id): id is string => !!id),
            );

            const toggleOne = (id: string) => {
              const next = new Set(selectedIds);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              field.onChange(buildProductsValue(next, availableProducts));
            };

            const setMany = (ids: string[], shouldSelect: boolean) => {
              const next = new Set(selectedIds);
              if (shouldSelect) {
                for (const id of ids) next.add(id);
              } else {
                for (const id of ids) next.delete(id);
              }
              field.onChange(buildProductsValue(next, availableProducts));
            };

            const selectedItems = allItems.filter((it) =>
              selectedIds.has(it.id),
            );

            return (
              <div className="flex items-stretch gap-2.5">
                <ProductPanel
                  title={t("productsSelected")}
                  totalLabel={String(selectedItems.length)}
                  items={selectedItems}
                  selectedIds={selectedIds}
                  onToggle={toggleOne}
                  onSetMany={setMany}
                  disabled={isDisabled}
                />
                <ProductPanel
                  title={t("productsAvailable")}
                  totalLabel={
                    selectedIds.size > 0
                      ? `${selectedIds.size}/${allItems.length}`
                      : String(allItems.length)
                  }
                  items={allItems}
                  selectedIds={selectedIds}
                  onToggle={toggleOne}
                  onSetMany={setMany}
                  disabled={isDisabled}
                />
              </div>
            );
          }}
        />
        <FieldError>{productsErrorMsg}</FieldError>
      </Field>
    </GlassCard>
  );
}

/* ── Helpers ────────────────────────────────── */

function buildProductsValue(
  selectedIds: Set<string>,
  availableProducts: ProductLocation[],
): SpotCheckFormValues["products"] {
  return Array.from(selectedIds).map((id) => {
    const product = availableProducts.find((p) => p.id === id);
    return {
      product_id: id,
      product_name: product?.name ?? "",
    };
  });
}

