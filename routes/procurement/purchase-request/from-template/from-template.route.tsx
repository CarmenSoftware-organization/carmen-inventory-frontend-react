import { useTranslations } from "use-intl";
import { FromTemplateContent } from "./from-template-content";
import { CreateWorkflowGate } from "@/components/share/create-workflow-gate";
import { WORKFLOW_TYPE } from "@/types/workflows";

export function Component() {
  const t = useTranslations("procurement.purchaseRequest");

  return (
    <CreateWorkflowGate
      workflowType={WORKFLOW_TYPE.PR}
      description={t("noCreatableWorkflow")}
    >
      <FromTemplateContent />
    </CreateWorkflowGate>
  );
}
