import { useParams } from "react-router";
import { RoleEditContent } from "./role-edit-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <RoleEditContent id={id} />;
}
