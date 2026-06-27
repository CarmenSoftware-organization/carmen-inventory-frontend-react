import { useParams } from "react-router";
import { EditPriceListContent } from "./edit-price-list-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditPriceListContent id={id} />;
}
