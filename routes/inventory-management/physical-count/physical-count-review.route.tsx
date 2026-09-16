import { useParams } from "react-router";
import { ReviewContent } from "./pc-review-content";

export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <ReviewContent id={id} />;
}
