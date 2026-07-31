import { useEffect } from "react";
import { useTranslations } from "use-intl";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import {
  Field,
  FieldLabel,
  FieldDatePicker,
} from "@/components/ui/field";
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

  // คอลัมน์กว้างคงที่ 12rem (ไม่ยืดเต็มแถว) → fields ชิดซ้าย compact และ align
  // ตรงกับ ribbon (po-header ใช้ track เดียวกัน). draft = 5 คอลัมน์ (มี workflow);
  // ไม่ draft = 4 (workflow ย้ายไป ribbon)
  // vendor span-2 → draft(workflow/vendor2/creditTerm/delivery/currency)=6,
  // non-draft(vendor2/creditTerm/delivery/currency)=5 units; cols-6 ทั้งคู่ให้ align
  // กับ ribbon (po-header)
  const lgGridCols = "lg:grid-cols-[repeat(6,minmax(0,10rem))]";

  return (
    <div
      className={`grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 ${lgGridCols}`}
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
    </div>
  );
}
