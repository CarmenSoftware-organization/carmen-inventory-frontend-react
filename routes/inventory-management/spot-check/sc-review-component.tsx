import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { useSubmitSpotCheck } from "@/hooks/use-spot-check";
import { useUnit } from "@/hooks/use-unit";
import type {
  SpotCheckReviewData,
  SpotCheckReviewItem,
} from "@/types/spot-check";
import { ReviewComponent } from "../shared/review-component";

interface ScReviewComponentProps {
  /** ข้อมูลที่ได้จาก PATCH /spot-check/{id}/review */
  readonly review: SpotCheckReviewData;
  /** Optional: ข้อความ location header (ส่งมาจาก entry component) */
  readonly locationCode?: string;
  readonly locationName?: string;
  /** Callback กลับไป entry mode (ยกเลิก review state) */
  readonly onBack?: () => void;
}

/**
 * Spot Check Review screen — ใช้ data จาก PATCH response (ไม่ GET ซ้ำ)
 * แสดง KPI tiles (Matches/Variances/Overages/Shortages) + variance grid + final submit
 */
export function ScReviewComponent({
  review,
  locationCode,
  locationName,
  onBack,
}: ScReviewComponentProps) {
  const t = useTranslations("inventoryManagement.spotCheck");
  const navigate = useNavigate();
  const submitSc = useSubmitSpotCheck(review.id);

  const { data: unitsData } = useUnit({ perpage: -1 });
  const unitNameById = new Map<string, string>();
  for (const u of unitsData?.data ?? []) {
    unitNameById.set(u.id, u.name);
  }

  let overages = 0;
  let shortages = 0;
  const varianceItems = review.items.filter((it) => it.diff_qty !== 0);
  for (const it of varianceItems) {
    if (it.diff_qty > 0) overages += 1;
    else shortages += 1;
  }

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  const handleSubmit = () => {
    submitSc.mutate(
      { doc_version: review.doc_version },
      {
        onSuccess: () => {
          toast.success(t("submitSuccess"));
          navigate("/inventory-management/spot-check");
        },
      },
    );
  };

  return (
    <ReviewComponent<SpotCheckReviewItem>
      translationNamespace="inventoryManagement.spotCheck"
      locationCode={locationCode}
      locationName={locationName}
      matches={review.matched}
      variances={review.variant}
      overages={overages}
      shortages={shortages}
      varianceItems={varianceItems}
      getSystemQty={(d) => d.inventory_qty}
      getActualQty={(d) => d.actual_qty}
      getVariance={(d) => d.diff_qty}
      getUnitName={(d) => unitNameById.get(d.inventory_unit_id) ?? ""}
      onBack={handleBack}
      onSubmit={handleSubmit}
      isSubmitting={submitSc.isPending}
      submitLabel={t("submitSpotCheck")}
      submittingLabel={t("submitting")}
    />
  );
}
