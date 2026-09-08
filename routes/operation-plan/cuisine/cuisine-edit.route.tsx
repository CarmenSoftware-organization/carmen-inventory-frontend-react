import { useParams } from "react-router";
import { CuisineEditContent } from "./cuisine-edit-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <CuisineEditContent id={id} />;
}
