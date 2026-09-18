import { useParams } from "react-router";
import { ScReviewContent } from "./sc-review-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <ScReviewContent id={id} />;
}
