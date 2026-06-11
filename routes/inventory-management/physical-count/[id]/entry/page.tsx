import { useParams } from "react-router";
import { PcEntryComponent } from "../../_components/pc-entry-component";

/** หน้า Entry การนับสต็อกของ Physical Count — id มาจาก route param (เดิม: Next params Promise) */
export default function PhysicalCountEntryPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <PcEntryComponent physicalCountId={id} />;
}

export const Component = PhysicalCountEntryPage;
