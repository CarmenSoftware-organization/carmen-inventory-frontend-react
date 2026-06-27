
import { ErrorState } from "@/components/ui/error-state";
import { usePhysicalCountReview } from "@/hooks/use-physical-count";
import { ItemListSkeleton } from "../../../shared/inv-shared";
import { PcReviewComponent } from "../../_components/pc-review-component";

export function ReviewContent({ id }: Readonly<{ id: string }>) {
  const { data, isLoading, error, refetch } = usePhysicalCountReview(id);

  if (error) {
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  }

  if (isLoading || !data) {
    return (
      <div className="p-3">
        <ItemListSkeleton count={5} />
      </div>
    );
  }

  return <PcReviewComponent physicalCountReview={data} />;
}
