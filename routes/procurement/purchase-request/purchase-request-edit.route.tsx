import { useParams } from "react-router";
import { PrEditContent } from "./pr-edit-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <PrEditContent id={id} />;
}
