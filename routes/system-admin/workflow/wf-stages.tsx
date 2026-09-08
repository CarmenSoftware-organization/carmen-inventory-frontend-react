import { useState } from "react";
import { useTranslations } from "use-intl";
import type { UseFormReturn, UseFieldArrayReturn } from "react-hook-form";
import type { User } from "@/types/workflows";
import type { WorkflowCreateModel } from "./wf-form-schema";
import { WfStageList } from "./wf-stage-list";
import { WfStageDetail } from "./wf-stage-detail";
import { WfStructureLockNotice } from "./wf-structure-lock-notice";

interface WfStagesProps {
  readonly form: UseFormReturn<WorkflowCreateModel>;
  readonly fieldArray: UseFieldArrayReturn<WorkflowCreateModel, "data.stages">;
  readonly users: User[];
  readonly isDisabled: boolean;
  /** ปิดเฉพาะการเพิ่ม ลบ สลับลำดับ และเปลี่ยนชื่อ stage — ที่เหลือของ stage ยังแก้ได้ */
  readonly isStructureDisabled: boolean;
  /** จำนวนเอกสารที่ยังดำเนินการอยู่ ใช้บอกเหตุผลตอนโครงถูกล็อก */
  readonly inProgressCount: number;
  readonly selectedIndex?: number;
  readonly onSelectIndex?: (index: number) => void;
}

export function WfStages({
  form,
  fieldArray,
  users,
  isDisabled,
  isStructureDisabled,
  inProgressCount,
  selectedIndex: controlledIndex,
  onSelectIndex,
}: WfStagesProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const selectedIndex = controlledIndex ?? internalIndex;
  const setSelectedIndex = onSelectIndex ?? setInternalIndex;
  const { fields } = fieldArray;
  const t = useTranslations("systemAdmin.workflow");

  const safeIndex = selectedIndex >= fields.length ? 0 : selectedIndex;

  // แสดงเฉพาะตอนอยู่ในโหมดแก้ไข — ตอนดูเฉย ๆ ทุกช่องเป็นสีเทาอยู่แล้ว ไม่มีอะไรให้อธิบาย
  const showLockNotice = isStructureDisabled && !isDisabled;

  return (
    <div className="pt-4">
      {showLockNotice && <WfStructureLockNotice count={inProgressCount} />}
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full shrink-0 lg:w-72 xl:w-80">
          <WfStageList
            form={form}
            fieldArray={fieldArray}
            selectedIndex={safeIndex}
            onSelect={setSelectedIndex}
            isDisabled={isStructureDisabled}
          />
        </div>

        <div className="bg-card flex-1 rounded-xl border p-4 shadow-sm md:p-6">
          {fields.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              {t("noStages")}
            </p>
          ) : (
            <WfStageDetail
              key={fields[safeIndex]?.id}
              form={form}
              index={safeIndex}
              users={users}
              isDisabled={isDisabled}
              isStructureDisabled={isStructureDisabled}
              isFirst={safeIndex === 0}
              isLast={safeIndex === fields.length - 1}
            />
          )}
        </div>
      </div>
    </div>
  );
}
