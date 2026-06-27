import { useParams } from "react-router";
import { PcEntryComponent } from "./pc-entry-component";

/** หน้า Entry การนับสต็อกของ Physical Count — id มาจาก route param */
export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <PcEntryComponent physicalCountId={id} />;
}
