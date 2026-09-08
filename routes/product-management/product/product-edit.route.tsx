import { useParams } from "react-router";
import { PdEditContent } from "./pd-edit-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <PdEditContent id={id} />;
}
