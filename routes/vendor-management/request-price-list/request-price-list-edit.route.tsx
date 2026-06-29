import { useParams } from "react-router";
import { EditRequestPriceListContent } from "./edit-request-price-list-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditRequestPriceListContent id={id} />;
}
