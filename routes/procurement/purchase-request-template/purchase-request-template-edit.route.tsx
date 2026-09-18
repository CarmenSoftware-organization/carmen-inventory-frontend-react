import { useParams } from "react-router";
import { PrtEditContent } from "./prt-edit-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <PrtEditContent id={id} />;
}
