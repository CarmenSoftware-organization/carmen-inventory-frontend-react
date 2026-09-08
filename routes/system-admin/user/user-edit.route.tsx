import { useParams } from "react-router";
import { UserEditContent } from "./user-edit-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <UserEditContent id={id} />;
}
