import { useParams } from "react-router";
import { ScByLocationContent } from "./spot-check-by-location-content";

/** หน้าสร้าง Spot Check ตาม location — location_id มาจาก route param */
export function Component() {
  const { location_id } = useParams<{ location_id: string }>();
  if (!location_id) return null;
  return <ScByLocationContent locationId={location_id} />;
}
