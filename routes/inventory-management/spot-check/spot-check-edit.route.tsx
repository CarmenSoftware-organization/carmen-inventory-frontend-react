import { useParams } from "react-router";
import { ScEditContent } from "./sc-edit-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <ScEditContent id={id} />;
}
