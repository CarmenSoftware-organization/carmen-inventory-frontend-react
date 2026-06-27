
import { useState } from "react";
import { useTranslations } from "use-intl";
import type { UseFormReturn, UseFieldArrayReturn } from "react-hook-form";
import type { User } from "@/types/workflows";
import type { WorkflowCreateModel } from "./wf-form-schema";
import { WfStageList } from "./wf-stage-list";
import { WfStageDetail } from "./wf-stage-detail";

interface WfStagesProps {
  readonly form: UseFormReturn<WorkflowCreateModel>;
  readonly fieldArray: UseFieldArrayReturn<WorkflowCreateModel, "data.stages">;
  readonly users: User[];
  readonly isDisabled: boolean;
  readonly selectedIndex?: number;
  readonly onSelectIndex?: (index: number) => void;
}

export function WfStages({
  form,
  fieldArray,
  users,
  isDisabled,
  selectedIndex: controlledIndex,
  onSelectIndex,
}: WfStagesProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const selectedIndex = controlledIndex ?? internalIndex;
  const setSelectedIndex = onSelectIndex ?? setInternalIndex;
  const { fields } = fieldArray;
  const t = useTranslations("systemAdmin.workflow");

  const safeIndex = selectedIndex >= fields.length ? 0 : selectedIndex;

  return (
    <div className="flex flex-col gap-3 pt-3 sm:flex-row">
      <div className="w-full shrink-0 sm:w-48">
        <WfStageList
          form={form}
          fieldArray={fieldArray}
          selectedIndex={safeIndex}
          onSelect={setSelectedIndex}
          isDisabled={isDisabled}
        />
      </div>

      <div className="flex-1 rounded border p-3">
        {fields.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-xs">
            {t("noStages")}
          </p>
        ) : (
          <WfStageDetail
            key={fields[safeIndex]?.id}
            form={form}
            fieldArray={fieldArray}
            index={safeIndex}
            users={users}
            isDisabled={isDisabled}
            isFirst={safeIndex === 0}
            isLast={safeIndex === fields.length - 1}
          />
        )}
      </div>
    </div>
  );
}
