
import { useEffect } from "react";
import { useForm, useWatch, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusSwitch } from "@/components/ui/status-switch";
import { LookupCurrencyIso } from "@/components/lookup/lookup-currency-iso";
import {
  Field,
  FieldGroup,
  FieldInput,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { useCreateCurrency, useUpdateCurrency } from "@/hooks/use-currency";
import { useExternalExchangeRates } from "@/hooks/use-exchange-rate";
import { useProfile } from "@/hooks/use-profile";
import { currenciesIso } from "@/constant/currencies-iso";
import {
  createCurrencySchema,
  EMPTY_FORM,
  type CurrencyFormValues,
} from "./currency-form-schema";
import type { Currency } from "@/types/currency";

interface CurrencyDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly currency?: Currency | null;
  readonly readOnly?: boolean;
}

/**
 * Dialog สร้าง/แก้ไข Currency — premium ERP design
 *
 * มี icon-beside-title header + primary accent strip + gradient overlay
 * รองรับทั้ง create (currency ไม่มี) และ edit (มี currency)
 * Auto-fill name/symbol/rate จาก ISO code เมื่อเลือกใน add mode
 */
export function CurrencyDialog({
  open,
  onOpenChange,
  currency,
  readOnly,
}: CurrencyDialogProps) {
  const isEdit = !!currency;
  const createCurrency = useCreateCurrency();
  const updateCurrency = useUpdateCurrency();
  const isPending = createCurrency.isPending || updateCurrency.isPending;
  const t = useTranslations("config.currency");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");

  const { defaultCurrencyCode } = useProfile();
  const baseCurrency = defaultCurrencyCode ?? "THB";
  const { data: exchangeRates } = useExternalExchangeRates(baseCurrency);

  const currencySchema = createCurrencySchema(tv, tfl);
  const form = useForm<CurrencyFormValues>({
    resolver: zodResolver(currencySchema) as Resolver<CurrencyFormValues>,
    defaultValues: EMPTY_FORM,
  });

  const watchedCode = useWatch({ control: form.control, name: "code" });

  useEffect(() => {
    if (open) {
      form.reset(
        currency
          ? {
              code: currency.code,
              name: currency.name,
              symbol: currency.symbol,
              exchange_rate: currency.exchange_rate,
              description: currency.description ?? "",
              // backend may omit decimal_places — fall back so zod coercion
              // (z.coerce.number().int()) doesn't see NaN and block submit.
              decimal_places: currency.decimal_places ?? 2,
              is_active: currency.is_active,
            }
          : EMPTY_FORM,
      );
    }
  }, [open, currency, form]);

  useEffect(() => {
    if (isEdit || !watchedCode) return;
    const selected = currenciesIso.find((c) => c.code === watchedCode);
    if (!selected) return;

    form.setValue("name", selected.name);
    form.setValue("symbol", selected.symbol);
    const rate = exchangeRates?.[watchedCode];
    const converted = rate && rate > 0 ? 1 / rate : 0.01;
    form.setValue("exchange_rate", converted);
    form.setValue("description", `${selected.name} (${selected.country})`);
  }, [watchedCode, isEdit, exchangeRates, form]);

  const onSubmit = (values: CurrencyFormValues) => {
    const payload = {
      code: values.code,
      name: values.name,
      symbol: values.symbol,
      exchange_rate: values.exchange_rate,
      description: values.description ?? "",
      decimal_places: values.decimal_places,
      is_active: values.is_active,
    };

    if (isEdit) {
      updateCurrency.mutate(
        // doc_version round-trips the loaded record's version — the backend
        // requires it on PATCH for optimistic concurrency (omitting it → 400).
        { id: currency.id, doc_version: currency.doc_version, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            onOpenChange(false);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createCurrency.mutate(payload, {
        onSuccess: () => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const submitLabel = isPending
    ? isEdit
      ? tf("saving")
      : tf("creating")
    : isEdit
      ? tc("save")
      : tc("create");

  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader className="gap-0 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Banknote className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base">
                  {isEdit
                    ? tf("editTitle", { entity: t("entity") })
                    : tf("addTitle", { entity: t("entity") })}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 border-t px-5 py-4">
            <FieldGroup className="gap-3">
              <Field>
                <FieldLabel required>{tfl("code")}</FieldLabel>
                <Controller
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <LookupCurrencyIso
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isEdit || isPending}
                      className="w-full"
                      error={form.formState.errors.code?.message}
                    />
                  )}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="currency-name" required>
                  {tfl("name")}
                </FieldLabel>
                <FieldInput
                  id="currency-name"
                  placeholder={t("namePlaceholder")}
                  className="h-8"
                  disabled={isPending || readOnly}
                  error={form.formState.errors.name?.message}
                  maxLength={100}
                  {...form.register("name")}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="currency-symbol" required>
                    {tfl("symbol")}
                  </FieldLabel>
                  <FieldInput
                    id="currency-symbol"
                    placeholder={t("symbolPlaceholder")}
                    className="h-8"
                    disabled
                    error={form.formState.errors.symbol?.message}
                    {...form.register("symbol")}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="currency-exchange-rate" required>
                    {tfl("exchangeRate")}
                  </FieldLabel>
                  <FieldInput
                    id="currency-exchange-rate"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    placeholder={t("ratePlaceholder")}
                    className="h-8 text-right tabular-nums"
                    disabled={isPending || readOnly}
                    error={form.formState.errors.exchange_rate?.message}
                    {...form.register("exchange_rate", { valueAsNumber: true })}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="currency-description">
                  {tfl("description")}
                </FieldLabel>
                <Textarea
                  id="currency-description"
                  placeholder={tfl("optional")}
                  rows={2}
                  disabled={isPending || readOnly}
                  maxLength={256}
                  {...form.register("description")}
                />
              </Field>

              <Controller
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <StatusSwitch
                    id="currency-is-active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isPending || readOnly}
                  />
                )}
              />
            </FieldGroup>
          </div>

          <DialogFooter className="bg-muted/20 border-t px-5 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {readOnly ? tc("close") : tc("cancel")}
            </Button>
            {!readOnly && (
              <Button type="submit" size="default" disabled={isPending}>
              {submitLabel}
            </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
