import { useParams } from "react-router";
import { EditStoreRequisitionContent } from "./edit-store-requisition-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditStoreRequisitionContent id={id} />;
}
