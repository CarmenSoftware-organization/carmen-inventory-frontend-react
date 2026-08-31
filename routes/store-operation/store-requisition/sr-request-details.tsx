import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Field, FieldLabel, FieldDatePicker } from "@/components/ui/field";
import { LookupUserLocation } from "@/components/lookup/lookup-user-location";
import { Input } from "@/components/ui/input";
import { LookupWorkflow } from "@/components/lookup/lookup-workflow";
import { INVENTORY_TYPE } from "@/constant/location";
import { WORKFLOW_TYPE } from "@/types/workflows";
import { STAGE_ROLE } from "@/types/stage-role";
import type { SrFormValues } from "./sr-form-schema";

interface LocationInfo {
  readonly name: string;
  readonly code: string;
  readonly location_type?: string;
}

interface SrRequestDetailsProps {
  readonly form: UseFormReturn<SrFormValues>;
  /** view mode + role-based lock → render เป็น plain text */
  readonly readOnly: boolean;
  /** submit pending → input ยังอยู่แต่กดไม่ได้ */
  readonly disabled: boolean;
  /**
   * แจ้งคลังต้นทางที่เลือกกลับให้ผู้เรียก — optional เพราะตอนนี้ไม่มีใครต้องการ
   * (แท็บ stock movement ดึงชื่อคลังมาจาก API เองแล้ว) คงไว้เพราะฝั่งปลายทางยังใช้
   * และวันไหนมีคนต้องใช้จะได้ไม่ต้องรื้อ dropdown ใหม่
   */
  readonly onFromLocInfoChange?: (info: LocationInfo) => void;
  readonly onToLocInfoChange: (info: LocationInfo) => void;
  readonly role?: string;
  /** draft/add เท่านั้นที่แสดง workflow picker — ไม่ draft ย้ายไป ribbon cell */
  readonly isDraft?: boolean;
  /** กำลังสร้างใบใหม่ — workflow ให้เลือกเฉพาะตัวที่ผู้ใช้เริ่มใบได้ */
  readonly isAdd?: boolean;
}

export function SrRequestDetails({
  form,
  readOnly,
  disabled,
  onFromLocInfoChange,
  onToLocInfoChange,
  role,
  isDraft = true,
  isAdd = false,
}: SrRequestDetailsProps) {
  "use no memo";
  const t = useTranslations("storeOperation.storeRequisition");
  const tfl = useTranslations("field");

  const errors = form.formState.errors;
  const srDate = form.watch("sr_date");
  const fromLocationId = form.watch("from_location_id");

  // role-based lock = ขั้น approve/issue/view ห้ามแก้ทั้ง section (ถาวร ไม่ใช่ pending)
  const isReadOnly =
    readOnly ||
    role === STAGE_ROLE.APPROVE ||
    role === STAGE_ROLE.ISSUE ||
    role === STAGE_ROLE.VIEW_ONLY;
  // โหมดอ่านอย่างเดียวใช้ control ชุดเดิมแล้วสั่ง disabled — ไม่มีสาขา plain text
  // แยกอีกชุด ช่องจึงอยู่ตำแหน่งเดิมและสูงเท่าเดิมตอนสลับโหมด
  const fieldDisabled = disabled || isReadOnly;

  return (
    <div className="my-4 grid grid-cols-1 gap-x-2 gap-y-4 sm:grid-cols-2 lg:grid-cols-6">
      {/* workflow อยู่ที่นี่ที่เดียวทุกโหมด — พ้น draft แล้วล็อกด้วย disabled
          ไม่ใช่ซ่อนแล้วไปโผล่บนแถบหัว (ฟิลด์เดียวกันไม่ควรมีสองที่อยู่) */}
      <Field>
        <FieldLabel required>{tfl("workflow")}</FieldLabel>
        <Controller
          control={form.control}
          name="workflow_id"
          render={({ field }) => (
            <LookupWorkflow
              value={field.value}
              onValueChange={field.onChange}
              workflowType={WORKFLOW_TYPE.SR}
              creatableOnly={isAdd}
              disabled={fieldDisabled || !isDraft}
              error={errors.workflow_id?.message}
              className="text-xs"
            />
          )}
        />
      </Field>
      <Field>
        <FieldLabel required>{tfl("expectedDate")}</FieldLabel>
        <Controller
          control={form.control}
          name="expected_date"
          render={({ field }) => (
            <FieldDatePicker
              value={field.value}
              onValueChange={field.onChange}
              disabled={fieldDisabled || !srDate}
              fromDate={srDate ? new Date(srDate) : undefined}
              placeholder={t("pickExpectedDate")}
              className="w-full"
              error={errors.expected_date?.message}
            />
          )}
        />
      </Field>

      <Field>
        <FieldLabel required>{tfl("fromLocation")}</FieldLabel>
        <Controller
          control={form.control}
          name="from_location_id"
          render={({ field }) => (
            <LookupUserLocation
              value={field.value}
              onValueChange={(val) => {
                field.onChange(val);
                if (val && val === form.getValues("to_location_id")) {
                  form.setValue("to_location_id", "");
                  onToLocInfoChange({ name: "", code: "" });
                }
              }}
              onItemChange={(item) =>
                onFromLocInfoChange?.({
                  name: item?.name ?? "",
                  code: item?.code ?? "",
                  location_type: item?.location_type,
                })
              }
              disabled={fieldDisabled}
              locationTypes={[
                INVENTORY_TYPE.INVENTORY,
                INVENTORY_TYPE.CONSIGNMENT,
              ]}
              popoverWidth="31.25rem"
              className="text-xs"
              error={errors.from_location_id?.message}
            />
          )}
        />
      </Field>

      <Field>
        <FieldLabel required>{tfl("toLocation")}</FieldLabel>
        <Controller
          control={form.control}
          name="to_location_id"
          render={({ field }) => (
            <LookupUserLocation
              value={field.value}
              onValueChange={field.onChange}
              onItemChange={(item) =>
                onToLocInfoChange({
                  name: item?.name ?? "",
                  code: item?.code ?? "",
                  location_type: item?.location_type,
                })
              }
              disabled={fieldDisabled || !fromLocationId}
              excludeIds={
                fromLocationId ? new Set([fromLocationId]) : undefined
              }
              popoverWidth="31.25rem"
              className="text-xs"
              error={errors.to_location_id?.message}
            />
          )}
        />
      </Field>

      {/* คำอธิบายต่อท้ายคลังปลายทาง อยู่ในตารางเดียวกับช่องอื่น ไม่ใช่ก้อนแยก
          ใต้ฟอร์ม — ช่องบรรทัดเดียวกว้าง 2 คอลัมน์ ไม่ใช่ Textarea เพราะจำกัด
          256 ตัวอักษรอยู่แล้ว เป็นข้อความสั้น ไม่ใช่บันทึกยาว */}
      <Field className="lg:col-span-2">
        <FieldLabel htmlFor="sr-description">{tfl("description")}</FieldLabel>
        <Input
          id="sr-description"
          placeholder={t("optionalDescription")}
          maxLength={256}
          disabled={fieldDisabled}
          className="text-xs"
          {...form.register("description")}
        />
      </Field>
    </div>
  );
}
