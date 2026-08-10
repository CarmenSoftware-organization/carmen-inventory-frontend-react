import { useEffect } from "react";
import { useTranslations } from "use-intl";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import {
  Field,
  FieldLabel,
  FieldDatePicker,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LookupVendor } from "@/components/lookup/lookup-vendor";
import { LookupCreditTerm } from "@/components/lookup/lookup-credit-term";
import { LookupCurrency } from "@/components/lookup/lookup-currency";
import { useCurrency } from "@/hooks/use-currency";
import { useProfile } from "@/hooks/use-profile";
import { LookupWorkflow } from "@/components/lookup/lookup-workflow";
import { WORKFLOW_TYPE } from "@/types/workflows";
import type { PoFormValues } from "./po-form-schema";
import {
  InputSuffixAddon,
  InputSuffixField,
  InputSuffixInput,
} from "@/components/ui/input/input-suffix";

interface PoGeneralFieldsProps {
  readonly form: UseFormReturn<PoFormValues>;
  readonly disabled: boolean;
  readonly isManual: boolean;
  readonly readOnly?: boolean;
  /** ใบยังเป็น draft ไหม — ไม่ draft แล้ว workflow แก้ไม่ได้ (แต่ยังแสดงอยู่) */
  readonly isDraft?: boolean;
  /** กำลังสร้างใบใหม่ — workflow ให้เลือกเฉพาะตัวที่ผู้ใช้เริ่มใบได้ */
  readonly isAdd?: boolean;
}

export function PoGeneralFields({
  form,
  disabled,
  isManual,
  readOnly = false,
  isDraft = true,
  isAdd = false,
}: PoGeneralFieldsProps) {
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const { defaultCurrencyId } = useProfile();

  const currencyId = useWatch({ control: form.control, name: "currency_id" });

  const { data: currencyData } = useCurrency({ perpage: -1 });

  const creditTermId = useWatch({
    control: form.control,
    name: "credit_term_id",
  });

  useEffect(() => {
    const currencies = currencyData?.data?.filter((c) => c.is_active) ?? [];
    if (!currencyId && defaultCurrencyId && currencies.length > 0) {
      const currency = currencies.find((c) => c.id === defaultCurrencyId);
      if (currency) {
        form.setValue("currency_id", defaultCurrencyId);
        form.setValue("currency_code", currency.code);
        form.setValue("exchange_rate", currency.exchange_rate);
      }
    }
  }, [currencyId, defaultCurrencyId, currencyData?.data, form]);

  // Fields editable only when PO is manual (linked PO locks these)
  //
  // โหมดอ่านอย่างเดียวใช้ control ชุดเดิมแล้วสั่ง disabled — ไม่มีสาขา plain text
  // แยกอีกชุดแล้ว · ของเดิมเขียน field ทั้งชุดสองรอบ (plain text กับ input) ซึ่ง
  // เพี้ยนกันเองได้ทุกครั้งที่แก้ข้างเดียว และตำแหน่ง/ความสูงช่องขยับตอนสลับโหมด
  const fieldDisabled = disabled || readOnly;
  const manualFieldDisabled = fieldDisabled || !isManual;
  // workflow ล็อกถาวรหลังพ้น draft — แต่ยังต้องเห็นค่าอยู่ จึงใช้ disabled
  // ไม่ใช่ซ่อนแล้วไปโผล่บนแถบหัว (ฟิลด์เดียวกันไม่ควรมีสองที่อยู่)
  const workflowDisabled = manualFieldDisabled || !isDraft;

  return (
    <div
      className={`grid grid-cols-1 gap-x-2 gap-y-4 sm:grid-cols-2 lg:grid-cols-6`}
    >
      <Field>
        <FieldLabel required>{tfl("workflow")}</FieldLabel>
        <Controller
          control={form.control}
          name="workflow_id"
          render={({ field, fieldState }) => (
            <LookupWorkflow
              value={field.value}
              onValueChange={field.onChange}
              workflowType={WORKFLOW_TYPE.PO}
              creatableOnly={isAdd}
              disabled={workflowDisabled}
              className="w-full text-xs"
              error={fieldState.error?.message}
            />
          )}
        />
      </Field>
      {/* ชื่อผู้ขายยาวกว่าช่องอื่นเป็นปกติ — กิน 2 คอลัมน์กันโดนตัด */}
      <Field className="lg:col-span-2">
        <FieldLabel required>{tfl("vendor")}</FieldLabel>
        <Controller
          control={form.control}
          name="vendor_id"
          render={({ field, fieldState }) => (
            <LookupVendor
              value={field.value}
              onValueChange={field.onChange}
              onItemChange={(vendor) => {
                form.setValue("vendor_name", vendor.name);
              }}
              disabled={manualFieldDisabled}
              error={fieldState.error?.message}
              className="text-xs"
            />
          )}
        />
      </Field>

      <Field>
        <FieldLabel>{tfl("creditTerm")}</FieldLabel>
        <LookupCreditTerm
          value={creditTermId}
          onValueChange={(val, creditTerm) => {
            form.setValue("credit_term_id", val);
            if (creditTerm) {
              form.setValue("credit_term_name", creditTerm.name);
              form.setValue("credit_term_value", creditTerm.value);
            }
          }}
          disabled={fieldDisabled}
        />
      </Field>
      {/* วันที่ใบสั่งซื้อ — คู่กับวันที่ส่งของ อ่านด้วยกัน (สั่งวันไหน ของถึงวันไหน)
          เดิมโชว์เป็นข้อความอ่านอย่างเดียวบนหัวใบ ทั้งที่ schema บังคับกรอกและ
          รับค่าได้อยู่แล้ว · ค่าตั้งต้นเป็นวันนี้ (ดู getDefaultValues) */}
      <Field>
        <FieldLabel required>{tfl("orderDate")}</FieldLabel>
        <Controller
          control={form.control}
          name="order_date"
          render={({ field, fieldState }) => (
            <FieldDatePicker
              value={field.value}
              onValueChange={field.onChange}
              disabled={fieldDisabled}
              placeholder={tc("selectDate")}
              className="w-full text-xs"
              error={fieldState.error?.message}
            />
          )}
        />
      </Field>
      <Field>
        <FieldLabel required>{tfl("deliveryDate")}</FieldLabel>
        <Controller
          control={form.control}
          name="delivery_date"
          render={({ field, fieldState }) => (
            <FieldDatePicker
              value={field.value}
              onValueChange={field.onChange}
              disabled={fieldDisabled}
              placeholder={tc("selectDate")}
              className="w-full text-xs"
              error={fieldState.error?.message}
            />
          )}
        />
      </Field>
      <Field>
        {/* ป้ายชิดขวาให้ตรงกับตัวเลขในช่อง ซึ่งจัดชิดขวาแบบคอลัมน์ตัวเลข
            (FieldLabel เป็น w-fit — ดันด้วย ml-auto ไม่ใช่ text-right) */}
        <FieldLabel required htmlFor="po-exchange-rate" className="ml-auto">
          {tfl("currency")}
        </FieldLabel>
        {/* กล่องเป็นคนแสดงสถานะ disabled — InputSuffixInput ปิดหน้าตา disabled
            ของตัวเองไว้ (disabled:bg-transparent) ไม่ส่งให้กล่องด้วยก็จะขาว
            อยู่ช่องเดียวทั้งที่ช่องอื่นเทาหมด */}
        <InputSuffixField
          className="h-8"
          disabled={fieldDisabled}
          error={!!form.formState.errors.currency_id?.message}
        >
          <InputSuffixInput
            id="po-exchange-rate"
            type="number"
            inputMode="decimal"
            step="0.0001"
            disabled={fieldDisabled}
            {...form.register("exchange_rate")}
          />
          <InputSuffixAddon>
            <Controller
              control={form.control}
              name="currency_id"
              render={({ field }) => (
                <LookupCurrency
                  value={field.value}
                  onValueChange={field.onChange}
                  onItemChange={(currency) => {
                    form.setValue("currency_code", currency.code);
                    form.setValue("exchange_rate", currency.exchange_rate);
                  }}
                  disabled={manualFieldDisabled}
                  className="h-full w-24 rounded-none border-0 bg-transparent px-2 text-xs shadow-none focus-visible:ring-0"
                />
              )}
            />
          </InputSuffixAddon>
        </InputSuffixField>
      </Field>

      {/* คำอธิบาย/หมายเหตุ อยู่ในตารางเดียวกับช่องอื่น ไม่ใช่ก้อนแยกใต้ฟอร์ม —
          เป็นช่องบรรทัดเดียวกว้าง 2 คอลัมน์ ไม่ใช่ Textarea เพราะทั้งคู่เป็น
          ข้อความสั้น (จำกัด 256 ตัวอักษรอยู่แล้ว) ไม่ใช่บันทึกยาว */}
      <Field className="lg:col-span-2">
        <FieldLabel htmlFor="po-description">{tfl("description")}</FieldLabel>
        <Input
          id="po-description"
          placeholder={tfl("optional")}
          maxLength={256}
          disabled={fieldDisabled}
          className="text-xs"
          {...form.register("description")}
        />
      </Field>

      <Field className="lg:col-span-2">
        <FieldLabel htmlFor="po-remarks">{tfl("remarks")}</FieldLabel>
        <Input
          id="po-remarks"
          placeholder={tfl("optional")}
          maxLength={256}
          disabled={fieldDisabled}
          className="text-xs"
          {...form.register("remarks")}
        />
      </Field>
    </div>
  );
}
