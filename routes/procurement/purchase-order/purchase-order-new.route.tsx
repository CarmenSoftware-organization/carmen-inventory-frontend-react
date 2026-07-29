import { useTranslations } from "use-intl";
import PoForm from "./po-form";
import { CreateWorkflowGate } from "@/components/share/create-workflow-gate";
import { WORKFLOW_TYPE } from "@/types/workflows";

export function Component() {
  const t = useTranslations("procurement.purchaseOrder");

  return (
    <CreateWorkflowGate
      workflowType={WORKFLOW_TYPE.PO}
      description={t("noCreatableWorkflow")}
    >
      <PoForm />
    </CreateWorkflowGate>
  );
}
