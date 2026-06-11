import { useParams } from "react-router";
import { ScByLocationContent } from "./_content";

/** หน้าสร้าง Spot Check ตาม location — location_id มาจาก route param (เดิม: Next params Promise) */
export default function SpotCheckByLocationPage() {
  const { location_id } = useParams<{ location_id: string }>();
  if (!location_id) return null;
  return <ScByLocationContent locationId={location_id} />;
}

export const Component = SpotCheckByLocationPage;
