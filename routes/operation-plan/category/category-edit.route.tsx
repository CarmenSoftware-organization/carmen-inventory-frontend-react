import { useParams } from "react-router";
import { RecipeCategoryEditContent } from "./recipe-category-edit-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <RecipeCategoryEditContent id={id} />;
}
