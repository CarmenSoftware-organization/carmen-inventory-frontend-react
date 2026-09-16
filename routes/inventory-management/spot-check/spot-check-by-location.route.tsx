import { useParams } from "react-router";
import { ScByLocationContent } from "./sc-by-location-content";

export function Component() {
  const { location_id } = useParams<{ location_id: string }>();
  if (!location_id) return null;
  return <ScByLocationContent locationId={location_id} />;
}
