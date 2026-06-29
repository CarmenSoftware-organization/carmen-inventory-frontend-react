
import { ErrorState } from "@/components/ui/error-state";
import {
  useSpotCheckById,
  useSpotCheckReview,
} from "@/hooks/use-spot-check";
import { ItemListSkeleton } from "../shared/inv-shared";
import { ScReviewComponent } from "./sc-review-component";

/**
 * Client wrapper สำหรับ Spot Check Review page
 * โหลด review data ผ่าน useSpotCheckReview (GET) + spot check info สำหรับ location header
 */
export function ScReviewContent({ id }: Readonly<{ id: string }>) {
  const {
    data: review,
    isLoading,
    error,
    refetch,
  } = useSpotCheckReview(id);
  // Reuse cached SpotCheckById เพื่อแสดง location ใน header (likely already cached จาก entry view)
  const { data: spotCheck } = useSpotCheckById(id);

  if (error) {
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  }

  if (isLoading || !review) {
    return (
      <div className="p-3">
        <ItemListSkeleton count={5} />
      </div>
    );
  }

  return (
    <ScReviewComponent
      review={review}
      locationCode={spotCheck?.location_code}
      locationName={spotCheck?.location_name}
    />
  );
}
