import { useParams } from "react-router";
import { EditEquipmentContent } from "./edit-equipment-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditEquipmentContent id={id} />;
}
