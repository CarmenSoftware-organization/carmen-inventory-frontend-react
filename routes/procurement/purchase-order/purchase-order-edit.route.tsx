import { useParams } from "react-router";
import { PoEditContent } from "./po-edit-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <PoEditContent id={id} />;
}
