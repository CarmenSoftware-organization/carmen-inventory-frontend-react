import { useParams } from "react-router";
import { PlEditContent } from "./pl-edit-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <PlEditContent id={id} />;
}
