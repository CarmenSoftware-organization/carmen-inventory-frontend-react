import { useParams } from "react-router";
import { ReviewContent } from "./_content";

/** หน้า Review ของ Physical Count — id มาจาก route param (เดิม: Next params Promise) */
export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <ReviewContent id={id} />;
}

export const Component = ReviewPage;
