import { useParams } from "react-router";
import { EditWorkflowContent } from "./edit-workflow-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditWorkflowContent id={id} />;
}
