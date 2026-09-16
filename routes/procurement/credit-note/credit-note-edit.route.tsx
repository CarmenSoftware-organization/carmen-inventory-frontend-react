import { useParams } from "react-router";
import { CnEditContent } from "./cn-edit-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <CnEditContent id={id} />;
}
