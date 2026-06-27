
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LookupProduct } from "@/components/lookup/lookup-product";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import { cn } from "@/lib/utils";
import { PlainText } from "@/components/share/glass-card";
import type { PltFormValues } from "./plt-form-schema";
import type { PriceListTemplate } from "@/types/price-list-template";

export interface PltProductCardLabels {
  readonly removeProduct: string;
  readonly removeTier: string;
  readonly addTier: string;
  readonly minimumOrder: string;
  readonly tierSingular: string;
  readonly tierPlural: string;
  readonly qty: string;
  readonly unit: string;
  readonly notePlaceholder: string;
  readonly product: string;
}

interface PltProductCardProps {
  readonly form: UseFormReturn<PltFormValues>;
  readonly productIndex: number;
  readonly tierIndices: number[];
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly productRef?: PriceListTemplate["products"][number];
  readonly onAddTier: () => void;
  readonly onRemoveTier: (detailIndex: number) => void;
  readonly onRemoveProduct: () => void;
  readonly labels: PltProductCardLabels;
}

/**
 * Product card สำหรับ template — แสดง product picker + MOQ tier list
 * tierIndices คือ list ของ index ใน flat details array ที่อยู่ใน product เดียวกัน
 */
export function PltProductCard({
  form,
  productIndex,
  tierIndices,
  isView,
  isDisabled,
  productRef,
  onAddTier,
  onRemoveTier,
  onRemoveProduct,
  labels,
}: PltProductCardProps) {
  // ใช้ index แรกของ product นี้เป็นตัวแทน product_id field
  const headDetailIndex = tierIndices[0];

  const tierCount = tierIndices.length;
  const tierWord = tierCount === 1 ? labels.tierSingular : labels.tierPlural;

  return (
    <div className="border-border/60 bg-card hover:border-primary/40 relative rounded-xl border p-3 transition-colors">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <ProductThumb name={productRef?.product_name} />
          <div className="bg-foreground text-background absolute -top-1 -left-1 flex size-4 items-center justify-center rounded-full text-[0.5625rem] font-semibold">
            {String(productIndex + 1).padStart(2, "0")}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {isView ? (
            <PlainText
              value={productRef?.product_name}
              subtitle={productRef?.code}
            />
          ) : (
            <Field>
              <Controller
                control={form.control}
                name={`details.${headDetailIndex}.product_id`}
                render={({ field }) => (
                  <LookupProduct
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isDisabled}
                    className="h-7 w-full text-xs"
                    error={
                      form.formState.errors.details?.[headDetailIndex]
                        ?.product_id?.message
                    }
                  />
                )}
              />
            </Field>
          )}
        </div>

        {!isDisabled && (
          <Button
            type="button"
            size="icon-xs"
            aria-label={labels.removeProduct}
            onClick={onRemoveProduct}
            className="bg-primary/10 text-muted-foreground hover:text-destructive hover:bg-primary/20 rounded-lg"
          >
            <X />
          </Button>
        )}
      </div>

      {/* MOQ tiers */}
      <div className="border-border/60 mt-3 border-t pt-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-muted-foreground text-[0.5625rem] font-bold tracking-widest uppercase">
            {labels.minimumOrder} — {tierCount} {tierWord}
          </div>
          {!isDisabled && (
            <button
              type="button"
              onClick={onAddTier}
              className="border-primary/40 bg-primary/5 text-primary inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-[0.625rem] font-semibold"
            >
              <Plus className="size-2.5" />
              {labels.addTier}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          {tierIndices.map((detailIndex, tierIdx) => (
            <MoqTierRow
              key={detailIndex}
              form={form}
              detailIndex={detailIndex}
              tierIndex={tierIdx}
              isView={isView}
              isDisabled={isDisabled}
              canRemove={tierCount > 1}
              onRemove={() => onRemoveTier(detailIndex)}
              labels={labels}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MoqTierRow({
  form,
  detailIndex,
  tierIndex,
  isView,
  isDisabled,
  canRemove,
  onRemove,
  labels,
}: {
  readonly form: UseFormReturn<PltFormValues>;
  readonly detailIndex: number;
  readonly tierIndex: number;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly canRemove: boolean;
  readonly onRemove: () => void;
  readonly labels: PltProductCardLabels;
}) {
  const productId =
    useWatch({
      control: form.control,
      name: `details.${detailIndex}.product_id`,
    }) ?? "";
  const errors = form.formState.errors.details?.[detailIndex];

  return (
    <div
      className={cn(
        "border-border/40 bg-background/60 grid items-center gap-2 rounded-lg border p-2",
        "grid-cols-[auto_4rem_1fr_auto] md:grid-cols-[auto_5rem_8rem_1fr_auto]",
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="bg-primary/10 text-primary flex size-5 items-center justify-center rounded text-[0.625rem] font-semibold">
        {tierIndex + 1}
      </span>

      <div className="min-w-0">
        <div className="text-muted-foreground/70 text-[0.5rem] font-bold tracking-widest uppercase">
          {labels.qty}
        </div>
        {isView ? (
          <div className="text-sm font-semibold tabular-nums">
            {form.getValues(`details.${detailIndex}.qty`) || 0}
          </div>
        ) : (
          <Input
            type="number"
            min={1}
            inputMode="decimal"
            disabled={isDisabled}
            placeholder="0"
            className="border-border/40 hover:border-foreground/50 focus-visible:border-primary h-auto w-full rounded-none border-0 border-b bg-transparent p-0 pb-0.5 text-sm font-semibold tabular-nums shadow-none transition-colors focus-visible:border-b-2 focus-visible:pb-0 focus-visible:ring-0"
            {...form.register(`details.${detailIndex}.qty`, {
              valueAsNumber: true,
            })}
          />
        )}
        {errors?.qty && (
          <FieldError className="mt-0.5">{errors.qty.message}</FieldError>
        )}
      </div>

      <div className="hidden min-w-0 md:block">
        <div className="text-muted-foreground/70 text-[0.5rem] font-bold tracking-widest uppercase">
          {labels.unit}
        </div>
        {isView ? (
          <div className="text-foreground truncate text-xs font-semibold">
            {form.getValues(`details.${detailIndex}.unit_name`) || "—"}
          </div>
        ) : (
          <Controller
            control={form.control}
            name={`details.${detailIndex}.unit_id`}
            render={({ field }) => (
              <LookupProductUnit
                productId={productId}
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                }}
                disabled={isDisabled}
                className="h-6 w-full text-[0.6875rem]"
                error={errors?.unit_id?.message}
              />
            )}
          />
        )}
      </div>

      <div className="md:border-border/40 min-w-0 border-l pl-2">
        {isView ? (
          <div className="text-muted-foreground truncate text-[0.6875rem]">
            {form.getValues(`details.${detailIndex}.note`) || "—"}
          </div>
        ) : (
          <Input
            type="text"
            disabled={isDisabled}
            placeholder={labels.notePlaceholder}
            maxLength={120}
            className="text-muted-foreground h-7 border-0 bg-transparent px-1 text-[0.6875rem] shadow-none focus-visible:ring-0"
            {...form.register(`details.${detailIndex}.note`)}
          />
        )}
      </div>

      {!isDisabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={labels.removeTier}
          disabled={!canRemove}
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive size-6 rounded-md"
        >
          <X />
        </Button>
      )}
    </div>
  );
}

function ProductThumb({ name }: { readonly name?: string | null }) {
  const letter = (name?.trim()[0] || "?").toUpperCase();
  return (
    <div
      className="relative size-9 overflow-hidden rounded-lg"
      style={{
        background: "linear-gradient(135deg, #e8d9a0 0%, #c8b97f 100%)",
      }}
    >
      <svg
        viewBox="0 0 40 40"
        className="absolute inset-0 size-full opacity-25"
        aria-hidden="true"
      >
        <circle cx="32" cy="8" r="14" fill="#fff" />
        <circle cx="6" cy="34" r="10" fill="#000" />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center font-serif text-base font-semibold"
        style={{ color: "#1a1814", letterSpacing: "-0.02em" }}
      >
        {letter}
      </div>
    </div>
  );
}
