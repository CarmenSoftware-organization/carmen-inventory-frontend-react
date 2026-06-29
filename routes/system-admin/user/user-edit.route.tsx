import { useParams } from "react-router";
import { UserDetailContent } from "./edit-user-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <UserDetailContent id={id} />;
}
