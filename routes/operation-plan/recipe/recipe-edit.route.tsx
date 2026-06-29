import { useParams } from "react-router";
import { EditRecipeContent } from "./edit-recipe-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditRecipeContent id={id} />;
}
