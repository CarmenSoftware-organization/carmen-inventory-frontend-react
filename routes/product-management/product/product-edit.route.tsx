import { useParams } from "react-router";
import { EditProductContent } from "./edit-product-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditProductContent id={id} />;
}
