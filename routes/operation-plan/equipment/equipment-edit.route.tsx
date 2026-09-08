import { useParams } from "react-router";
import { EqEditContent } from "./eq-edit-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EqEditContent id={id} />;
}
