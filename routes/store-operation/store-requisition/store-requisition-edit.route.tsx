import { useParams } from "react-router";
import { SrEditContent } from "./sr-edit-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <SrEditContent id={id} />;
}
