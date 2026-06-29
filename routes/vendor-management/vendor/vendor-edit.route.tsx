import { useParams } from "react-router";
import { EditVendorContent } from "./edit-vendor-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditVendorContent id={id} />;
}
