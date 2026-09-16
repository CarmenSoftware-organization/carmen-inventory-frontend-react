import { useParams } from "react-router";
import { PcEntryComponent } from "./pc-entry-component";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <PcEntryComponent physicalCountId={id} />;
}
