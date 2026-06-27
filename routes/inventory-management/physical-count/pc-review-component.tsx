
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { useErrorToast } from "@/hooks/use-error-toast";
import { useSubmitPhysicalCount } from "@/hooks/use-physical-count";
import type {
  PhysicalCountData,
  PhysicalCountDetail,
} from "@/types/physical-count";
import { ReviewComponent } from "../shared/review-component";

interface PcReviewComponentProps {
  readonly physicalCountReview: PhysicalCountData;
}

export function PcReviewComponent({
  physicalCountReview,
}: PcReviewComponentProps) {
  const t = useTranslations("inventoryManagement.physicalCount");
  const navigate = useNavigate();
  const errorToast = useErrorToast();
  const submitPhysicalCount = useSubmitPhysicalCount(physicalCountReview.id);

  let m = 0;
  let o = 0;
  let s = 0;
  const varianceList: PhysicalCountDetail[] = [];
  for (const d of physicalCountReview.details ?? []) {
    if (d.actual_qty == null) continue;
    if (d.diff_qty === 0) m += 1;
    else {
      varianceList.push(d);
      if (d.diff_qty > 0) o += 1;
      else s += 1;
    }
  }
  const matches = m;
  const overages = o;
  const shortages = s;
  const varianceItems = varianceList;
  const variances = varianceList.length;

  const handleSubmit = () => {
    submitPhysicalCount.mutate(
      {},
      {
        onSuccess: () => {
          toast.success(t("reviewSubmitSuccess"));
          navigate("/inventory-management/physical-count");
        },
        onError: errorToast,
      },
    );
  };

  return (
    <ReviewComponent<PhysicalCountDetail>
      translationNamespace="inventoryManagement.physicalCount"
      locationCode={physicalCountReview.location_code}
      locationName={physicalCountReview.location_name}
      matches={matches}
      variances={variances}
      overages={overages}
      shortages={shortages}
      varianceItems={varianceItems}
      getSystemQty={(d) => d.on_hand_qty}
      getActualQty={(d) => d.actual_qty ?? null}
      getVariance={(d) => d.diff_qty}
      getUnitName={(d) => d.inventory_unit_name}
      onBack={() => navigate(-1)}
      onSubmit={handleSubmit}
      isSubmitting={submitPhysicalCount.isPending}
      submitLabel={t("submitPhysicalCount")}
      submittingLabel={t("reviewSubmitting")}
    />
  );
}
