import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  Field,
  FieldDatePicker,
  FieldInput,
  FieldLabel,
  FieldSelect,
} from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import {
  InputSuffixAddon,
  InputSuffixField,
  InputSuffixAmount,
} from "@/components/ui/input/input-suffix";
import { Input } from "@/components/ui/input";
import { LookupVendor } from "@/components/lookup/lookup-vendor";
import { addDays } from "@/lib/date-utils";
import { LookupCurrency } from "@/components/lookup/lookup-currency";
import { LookupCreditTerm } from "@/components/lookup/lookup-credit-term";
import type { GrnFormValues } from "./grn-form-schema";

interface GrnFormHeaderProps {
  readonly form: UseFormReturn<GrnFormValues>;
  readonly disabled: boolean;
  readonly fromWizard?: boolean;
  /** view mode → แสดงทุก field เป็น plain text แทน input (เหมือน CN) */
}

export function GrnFormHeader({
  form,
  disabled,
  fromWizard = false,
}: GrnFormHeaderProps) {
  "use no memo";
  const t = useTranslations("procurement.goodsReceiveNote");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const errors = form.formState.errors;

  const vendorName = useWatch({ control: form.control, name: "vendor_name" });
  const docType = useWatch({ control: form.control, name: "doc_type" });
  const isPo = docType === "purchase_order";
  const invoiceDate = useWatch({ control: form.control, name: "invoice_date" });
  const viewFieldGap = "gap-1";

  const syncDueDate = (invoiceDate?: string | null, days?: number | null) => {
    if (!invoiceDate) return;
    if (days != null) {
      form.setValue("payment_due_date", addDays(invoiceDate, days), {
        shouldDirty: true,
      });
      return;
    }
    const due = form.getValues("payment_due_date");
    if (due && new Date(due) < new Date(invoiceDate)) {
      form.setValue("payment_due_date", invoiceDate, { shouldDirty: true });
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Field className={`${viewFieldGap ?? ""} lg:col-span-2`}>
          <FieldLabel required>{tfl("vendor")}</FieldLabel>
          <Controller
            control={form.control}
            name="vendor_id"
            render={({ field }) => (
              <LookupVendor
                value={field.value ?? ""}
                onValueChange={field.onChange}
                onItemChange={(v) => form.setValue("vendor_name", v.name)}
                defaultLabel={vendorName || undefined}
                disabled={disabled || isPo}
                error={errors.vendor_id?.message}
                className="text-xs"
              />
            )}
          />
        </Field>
        <Field className={viewFieldGap}>
          <FieldLabel required>{tfl("grnDate")}</FieldLabel>
          <Controller
            control={form.control}
            name="grn_date"
            render={({ field }) => (
              <FieldDatePicker
                value={field.value ?? ""}
                onValueChange={field.onChange}
                disabled={disabled}
                placeholder={tc("selectDate")}
                className="w-full text-xs"
                error={errors.grn_date?.message}
              />
            )}
          />
        </Field>

        <Field className={viewFieldGap}>
          <FieldLabel htmlFor="grn-exchange-rate" required>
            {tfl("currency")}
          </FieldLabel>
          <InputSuffixField
            className="w-full"
            disabled={disabled}
            error={!!errors.currency_id?.message}
          >
            <InputSuffixAddon>
              <Controller
                control={form.control}
                name="currency_id"
                render={({ field }) => (
                  <LookupCurrency
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    onItemChange={(currency) => {
                      form.setValue("currency_name", currency.code);
                      form.setValue("exchange_rate", currency.exchange_rate);
                    }}
                    disabled={disabled || fromWizard}
                    className="h-full w-24 rounded-none border-0 bg-transparent px-2 text-xs shadow-none focus-visible:ring-0"
                  />
                )}
              />
            </InputSuffixAddon>
            <Controller
              control={form.control}
              name="exchange_rate"
              render={({ field }) => (
                <InputSuffixAmount
                  id="grn-exchange-rate"
                  decimals={5}
                  disabled={disabled}
                  value={Number(field.value) || 0}
                  onValueChange={field.onChange}
                />
              )}
            />
          </InputSuffixField>
        </Field>

        <Field className={viewFieldGap}>
          <FieldLabel>{t("postType")}</FieldLabel>
          <Controller
            control={form.control}
            name="post_type"
            render={({ field }) => (
              <FieldSelect
                value={field.value}
                onValueChange={field.onChange}
                disabled={disabled}
                className="w-full text-xs"
                error={errors.post_type?.message}
              >
                <SelectContent>
                  <SelectItem value="ap">{t("ap")}</SelectItem>
                  <SelectItem value="consignment">
                    {t("consignment")}
                  </SelectItem>
                  <SelectItem value="cash">{t("cash")}</SelectItem>
                </SelectContent>
              </FieldSelect>
            )}
          />
        </Field>

        <Field className={viewFieldGap}>
          <FieldLabel>{tfl("creditTerm")}</FieldLabel>
          <Controller
            control={form.control}
            name="credit_term_id"
            render={({ field }) => (
              <LookupCreditTerm
                value={field.value ?? ""}
                onValueChange={(value, creditTerm) => {
                  field.onChange(value);
                  if (creditTerm) {
                    form.setValue("credit_term_name", creditTerm.name);
                    form.setValue("credit_term_days", creditTerm.value);
                    syncDueDate(
                      form.getValues("invoice_date"),
                      creditTerm.value,
                    );
                  }
                }}
                className="w-full text-xs"
                disabled={disabled}
              />
            )}
          />
        </Field>

        <Field className={viewFieldGap}>
          <FieldLabel htmlFor="grn-invoice-no" required>
            {tfl("invoiceNo")}
          </FieldLabel>
          <FieldInput
            id="grn-invoice-no"
            placeholder={t("invoiceNoPlaceholder")}
            className="w-full"
            disabled={disabled}
            error={errors.invoice_no?.message}
            {...form.register("invoice_no")}
          />
        </Field>

        <Field className={viewFieldGap}>
          <FieldLabel required>{t("invoiceDate")}</FieldLabel>
          <Controller
            control={form.control}
            name="invoice_date"
            render={({ field }) => (
              <FieldDatePicker
                value={field.value ?? ""}
                onValueChange={(v) => {
                  field.onChange(v);
                  syncDueDate(v, form.getValues("credit_term_days"));
                }}
                disabled={disabled}
                placeholder={tc("selectDate")}
                className="w-full text-xs"
                error={errors.invoice_date?.message}
              />
            )}
          />
        </Field>

        <Field className={viewFieldGap}>
          <FieldLabel required>{t("dueDate")}</FieldLabel>
          <Controller
            control={form.control}
            name="payment_due_date"
            render={({ field }) => (
              <FieldDatePicker
                value={field.value ?? ""}
                onValueChange={field.onChange}
                disabled={disabled}
                placeholder={tc("selectDate")}
                // เลือกเองทับค่าที่คำนวณให้ได้ แต่ห้ามก่อนวันที่ใบแจ้งหนี้ —
                // ครบกำหนดจ่ายก่อนวันที่ออกใบแจ้งหนี้ไม่มีอยู่จริง
                fromDate={invoiceDate ? new Date(invoiceDate) : undefined}
                className="w-full text-xs"
              />
            )}
          />
        </Field>
        <Field className="lg:col-span-2">
          <FieldLabel htmlFor="grn-description">
            {tfl("description")}
          </FieldLabel>
          <Input
            id="grn-description"
            placeholder={t("descriptionPlaceholder")}
            maxLength={256}
            disabled={disabled}
            className="text-xs"
            {...form.register("description")}
          />
        </Field>
      </div>
    </div>
  );
}
