import { useEffect } from "react";
import { useTranslations } from "use-intl";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import {
  Field,
  FieldDatePicker,
  FieldInput,
  FieldLabel,
  FieldSelect,
} from "@/components/ui/field";
import {
  InputSuffixAddon,
  InputSuffixField,
  InputSuffixInput,
} from "@/components/ui/input/input-suffix";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { LookupVendor } from "@/components/lookup/lookup-vendor";
import { LookupCurrency } from "@/components/lookup/lookup-currency";
import { LookupGrnByVendorForCn } from "@/components/lookup/lookup-grn-by-vendor-for-cn";
import { LookupCnReason } from "@/components/lookup/lookup-cn-reason";
import { useProfile } from "@/hooks/use-profile";
import { useCurrency } from "@/hooks/use-currency";
import type { CnFormValues } from "./cn-form-schema";

interface CnGeneralFieldsProps {
  readonly form: UseFormReturn<CnFormValues>;
  readonly disabled: boolean;
}

export function CnGeneralFields({ form, disabled }: CnGeneralFieldsProps) {
  const t = useTranslations("procurement.creditNote");
  const tfl = useTranslations("field");
  const tc = useTranslations("common");

  const { defaultCurrencyId } = useProfile();
  const { data: currencyData } = useCurrency({ perpage: -1 });

  const errors = form.formState.errors;
  const vendorId = useWatch({ control: form.control, name: "vendor_id" });
  const currencyCode = useWatch({
    control: form.control,
    name: "currency_code",
  });
  // GRN Reference เป็น plain text เสมอ → ต้อง watch ให้ reactive ตอนเลือก GRN
  const invoiceNo = useWatch({ control: form.control, name: "invoice_no" });

  // Seed default currency จาก profile เมื่อยังว่าง (เหมือน PO/GRN) —
  // การเลือก GRN จะ override ค่าทีหลังถ้าต่างกัน
  useEffect(() => {
    const currencies = currencyData?.data?.filter((c) => c.is_active) ?? [];
    if (!currencyCode && defaultCurrencyId && currencies.length > 0) {
      const currency = currencies.find((c) => c.id === defaultCurrencyId);
      if (currency) {
        form.setValue("currency_code", defaultCurrencyId);
        form.setValue("exchange_rate", currency.exchange_rate);
      }
    }
  }, [currencyCode, defaultCurrencyId, currencyData?.data, form]);

  // โหมดอ่านอย่างเดียวใช้ช่องชุดเดิมแล้วสั่ง disabled — ไม่มีสาขา plain text
  // แยกอีกชุด ช่องจึงอยู่ตำแหน่งเดิมและสูงเท่าเดิมตอนสลับโหมด
  return (
    // 6 คอลัมน์ยืดเต็มความกว้าง (ไม่ล็อก 10rem) — แถวแรกจบพอดีที่ GRN Date
    // ต่อจากเหตุผล และแถวสองจบพอดีที่ Tax Invoice Date ต่อจากเลขที่ใบกำกับภาษี
    // ของเดิม 5 คอลัมน์ทำให้ทั้งสองช่องนั้นตกไปขึ้นบรรทัดใหม่คนละแถวกับคู่ของมัน
    // ผู้ขายกิน 2 ช่องเหมือนเดิม (ชื่อบริษัทยาว) พอแทรกวันที่ใบลดหนี้เข้ามาแถว
    // แรกจึงเป็น 7 ช่อง GRN Date ตกไปขึ้นแถวสอง — ยอมแลกเพราะชื่อผู้ขายอ่านออก
    // สำคัญกว่าการจบแถวพอดี
    <div className="grid grid-cols-1 gap-x-2 gap-y-4 sm:grid-cols-2 lg:grid-cols-6">
      <Field>
        <FieldLabel required>{t("cnType")}</FieldLabel>
        <Controller
          control={form.control}
          name="credit_note_type"
          render={({ field }) => (
            <FieldSelect
              value={field.value}
              onValueChange={field.onChange}
              placeholder={tfl("selectType")}
              className="w-full text-xs"
              disabled={disabled}
              error={errors.credit_note_type?.message}
              size="sm"
            >
              <SelectContent>
                <SelectItem value="quantity_return" className="text-xs">
                  {t("quantityReturn")}
                </SelectItem>
                <SelectItem value="amount_discount" className="text-xs">
                  {t("amountDiscount")}
                </SelectItem>
              </SelectContent>
            </FieldSelect>
          )}
        />
      </Field>

      <Field className="lg:col-span-2">
        <FieldLabel required>{tfl("vendor")}</FieldLabel>
        <Controller
          control={form.control}
          name="vendor_id"
          render={({ field }) => (
            <LookupVendor
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled}
              error={errors.vendor_id?.message}
              className="text-xs"
            />
          )}
        />
      </Field>

      {/* วันที่ใบลดหนี้ — อยู่ต่อจากผู้ขายเพราะเป็นข้อมูลของใบนี้เอง ไม่ใช่ค่าที่
          ลากมาจาก GRN เหมือนช่องที่เหลือในแถวนี้ · แก้ได้ เพราะลงระบบย้อนหลัง
          ได้จริง (ของมาถึงวันหนึ่ง เปิดใบลดหนี้อีกวันหนึ่ง) ค่าตั้งต้นเป็นวันนี้ */}
      <Field>
        <FieldLabel required>{tfl("docDate")}</FieldLabel>
        <Controller
          control={form.control}
          name="cn_date"
          render={({ field }) => (
            <FieldDatePicker
              value={field.value}
              onValueChange={field.onChange}
              placeholder={tc("selectDate")}
              className="w-full text-xs"
              disabled={disabled}
              error={errors.cn_date?.message}
            />
          )}
        />
      </Field>

      <Field>
        <FieldLabel required>{tfl("grnNo")}</FieldLabel>
        <Controller
          control={form.control}
          name="grn_id"
          render={({ field }) => (
            <LookupGrnByVendorForCn
              value={field.value}
              onValueChange={field.onChange}
              onItemChange={(grn) => {
                form.setValue("grn_date", grn.grn_date ?? "");
                form.setValue("currency_code", grn.currency_id ?? "");
                form.setValue("exchange_rate", grn.exchange_rate ?? 1);
                form.setValue("invoice_no", grn.invoice_no ?? "");
                form.setValue("invoice_date", grn.invoice_date ?? "");
                // เปลี่ยน GRN → ล้าง items เดิม (เป็นของ GRN ก่อนหน้า, product/location
                // คนละชุด) · onItemChange ยิงเฉพาะตอน user เลือกเอง ไม่ยิงตอน mount
                // จึงไม่ล้าง items ที่โหลดมาในโหมด edit
                form.setValue("items", [], { shouldDirty: true });
              }}
              vendorId={vendorId}
              disabled={disabled}
              error={errors.grn_id?.message}
              className="text-xs"
            />
          )}
        />
      </Field>

      <Field>
        <FieldLabel required>{tfl("reason")}</FieldLabel>
        <Controller
          control={form.control}
          name="reason"
          render={({ field }) => (
            <LookupCnReason
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled}
              error={errors.reason?.message}
              className="w-full text-xs"
            />
          )}
        />
      </Field>
      <Field>
        <FieldLabel>{tfl("grnDate")}</FieldLabel>
        <Controller
          control={form.control}
          name="grn_date"
          render={({ field }) => (
            <FieldDatePicker
              value={field.value}
              onValueChange={field.onChange}
              placeholder={tc("selectDate")}
              className="w-full text-xs"
              disabled
              error={errors.grn_date?.message}
            />
          )}
        />
      </Field>

      <Field>
        <FieldLabel>{tfl("invoiceNo")}</FieldLabel>
        {/* ช่องนี้กรอกเองไม่ได้ — ค่ามาจาก GRN ที่เลือก · placeholder จึงบอก
            ที่มา ไม่ใช่ตัวอย่างรูปแบบเลขที่ (แบบ GRN ที่พิมพ์เองได้) */}
        <Input
          value={invoiceNo}
          placeholder={t("invoiceNoPlaceholder")}
          disabled
        />
      </Field>

      <Field>
        <FieldLabel>{tfl("invoiceDate")}</FieldLabel>
        <Controller
          control={form.control}
          name="invoice_date"
          render={({ field }) => (
            <FieldDatePicker
              value={field.value}
              onValueChange={field.onChange}
              placeholder={tc("selectDate")}
              className="w-full text-xs"
              disabled
              error={errors.invoice_date?.message}
            />
          )}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="cn-exchange-rate">{tfl("currency")}</FieldLabel>
        <InputSuffixField
          disabled={disabled}
          error={!!errors.currency_code?.message}
        >
          <InputSuffixInput
            id="cn-exchange-rate"
            type="number"
            inputMode="decimal"
            step="0.0001"
            disabled={disabled}
            {...form.register("exchange_rate")}
          />
          <InputSuffixAddon>
            <Controller
              control={form.control}
              name="currency_code"
              render={({ field }) => (
                <LookupCurrency
                  value={field.value}
                  onValueChange={field.onChange}
                  onItemChange={(currency) => {
                    form.setValue("exchange_rate", currency.exchange_rate);
                  }}
                  disabled={disabled}
                  className="h-full w-24 rounded-none border-0 bg-transparent px-2 text-xs shadow-none focus-visible:ring-0"
                />
              )}
            />
          </InputSuffixAddon>
        </InputSuffixField>
      </Field>

      <Field>
        <FieldLabel htmlFor="cn-tax-invoice-no" required>
          {tfl("taxInvoiceNo")}
        </FieldLabel>
        <FieldInput
          id="cn-tax-invoice-no"
          placeholder="e.g. TAX-001"
          className="h-8"
          disabled={disabled}
          maxLength={100}
          error={errors.tax_invoice_no?.message}
          {...form.register("tax_invoice_no")}
        />
      </Field>

      <Field>
        <FieldLabel required>{tfl("taxInvoiceDate")}</FieldLabel>
        <Controller
          control={form.control}
          name="tax_invoice_date"
          render={({ field }) => (
            <FieldDatePicker
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled}
              placeholder={tc("selectDate")}
              className="w-full text-xs"
              error={errors.tax_invoice_date?.message}
            />
          )}
        />
      </Field>

      {/* คำอธิบายอยู่ในตารางเดียวกับช่องอื่น ไม่ใช่ก้อนแยกใต้ฟอร์ม — ช่อง
          บรรทัดเดียวกว้าง 2 คอลัมน์ ไม่ใช่ Textarea เพราะจำกัด 256 ตัวอักษร
          อยู่แล้ว เป็นข้อความสั้น ไม่ใช่บันทึกยาว */}
      <Field className="lg:col-span-2">
        <FieldLabel htmlFor="cn-description">{tfl("description")}</FieldLabel>
        <Input
          id="cn-description"
          placeholder={tfl("optional")}
          maxLength={256}
          disabled={disabled}
          className="text-xs"
          {...form.register("description")}
        />
      </Field>
    </div>
  );
}
