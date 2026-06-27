import { useParams } from "react-router";
import { EditPriceListTemplateContent } from "./edit-price-list-template-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditPriceListTemplateContent id={id} />;
}
