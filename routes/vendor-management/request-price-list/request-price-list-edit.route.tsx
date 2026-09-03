import { useParams } from "react-router";
import { RfpEditContent } from "./rfp-edit-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <RfpEditContent id={id} />;
}
