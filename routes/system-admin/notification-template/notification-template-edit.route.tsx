import { useParams } from "react-router";
import { NotiTmplEditContent } from "./noti-tmpl-edit-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <NotiTmplEditContent id={id} />;
}
