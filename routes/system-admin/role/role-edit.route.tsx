import { useParams } from "react-router";
import { EditRoleContent } from "./edit-role-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditRoleContent id={id} />;
}
