import { useParams } from "react-router";
import { EditRecipeCategoryContent } from "./edit-category-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditRecipeCategoryContent id={id} />;
}
