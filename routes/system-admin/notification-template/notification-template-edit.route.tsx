import { useParams } from "react-router";
import { NotiTmplDetailContent } from "./edit-notification-template-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <NotiTmplDetailContent id={id} />;
}
