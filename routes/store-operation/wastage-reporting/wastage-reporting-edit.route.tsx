import { useParams } from "react-router";
import { EditWastageReportContent } from "./edit-wastage-reporting-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <EditWastageReportContent id={id} />;
}
