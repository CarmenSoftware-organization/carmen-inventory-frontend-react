import { useParams } from "react-router";
import { EditCuisineContent } from "./edit-cuisine-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditCuisineContent id={id} />;
}
