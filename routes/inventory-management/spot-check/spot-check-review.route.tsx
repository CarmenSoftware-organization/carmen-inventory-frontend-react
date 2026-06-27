import { useParams } from "react-router";
import { ScReviewContent } from "./spot-check-review-content";

/** หน้า Review ของ Spot Check — id มาจาก route param */
export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <ScReviewContent id={id} />;
}
