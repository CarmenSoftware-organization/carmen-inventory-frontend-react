import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { summarizeVariance } from "../shared/variance-summary";
import { toast } from "sonner";
import { useSubmitPhysicalCount } from "../shared/use-physical-count";
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
  const submitPhysicalCount = useSubmitPhysicalCount(physicalCountReview.id);

  const { matches, variances, overages, shortages, varianceItems } =
    summarizeVariance(physicalCountReview.details, {
      getDiff: (d) => d.diff_qty,
      // แถวที่ยังไม่ได้นับ ไม่ใช่ "ตรง" — นับรวมเข้าไปคือรายงานว่านับครบแล้วทั้งที่ยังไม่ครบ
      isCounted: (d) => d.actual_qty != null,
    });

  const handleSubmit = () => {
    submitPhysicalCount.mutate(
      { doc_version: physicalCountReview.doc_version },
      {
        onSuccess: () => {
          toast.success(t("reviewSubmitSuccess"));
          navigate("/inventory-management/physical-count");
        },
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
