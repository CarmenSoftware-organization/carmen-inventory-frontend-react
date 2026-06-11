import { useParams } from "react-router";
import { ScReviewContent } from "./_content";

/** หน้า Review ของ Spot Check ตาม id — id มาจาก route param (เดิม: Next params Promise) */
export default function SpotCheckReviewPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <ScReviewContent id={id} />;
}

export const Component = SpotCheckReviewPage;
