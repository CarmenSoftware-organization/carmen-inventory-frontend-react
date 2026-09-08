import { useParams } from "react-router";
import { WfEditContent } from "./wf-edit-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <WfEditContent id={id} />;
}
