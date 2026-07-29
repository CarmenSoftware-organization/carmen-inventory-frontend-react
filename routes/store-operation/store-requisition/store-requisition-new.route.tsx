import { useTranslations } from "use-intl";
import { StoreRequisitionForm } from "./sr-form";
import { CreateWorkflowGate } from "@/components/share/create-workflow-gate";
import { WORKFLOW_TYPE } from "@/types/workflows";

export function Component() {
  const t = useTranslations("storeOperation.storeRequisition");

  return (
    <CreateWorkflowGate
      workflowType={WORKFLOW_TYPE.SR}
      description={t("noCreatableWorkflow")}
    >
      <StoreRequisitionForm />
    </CreateWorkflowGate>
  );
}
