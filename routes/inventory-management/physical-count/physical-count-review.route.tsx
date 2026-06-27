import { useParams } from "react-router";
import { ReviewContent } from "./physical-count-review-content";

/** หน้า Review ของ Physical Count — id มาจาก route param */
export function Component() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <ReviewContent id={id} />;
}
