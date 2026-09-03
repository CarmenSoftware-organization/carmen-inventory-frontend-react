import { useParams } from "react-router";
import { RecipeEditContent } from "./recipe-edit-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <RecipeEditContent id={id} />;
}
