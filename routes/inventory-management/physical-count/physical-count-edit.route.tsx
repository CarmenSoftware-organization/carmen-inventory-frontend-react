import { useParams } from "react-router";
import { PcEditContent } from "./pc-edit-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <PcEditContent id={id} />;
}
