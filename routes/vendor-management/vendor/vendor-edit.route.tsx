import { useParams } from "react-router";
import { VendorEditContent } from "./vendor-edit-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <VendorEditContent id={id} />;
}
