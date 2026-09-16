import { useParams } from "react-router";
import { IaEditContent } from "./ia-edit-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <IaEditContent id={id} />;
}
