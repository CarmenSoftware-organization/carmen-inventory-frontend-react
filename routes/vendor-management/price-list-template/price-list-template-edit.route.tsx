import { useParams } from "react-router";
import { PltEditContent } from "./plt-edit-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <PltEditContent id={id} />;
}
