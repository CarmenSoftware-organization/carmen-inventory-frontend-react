
import { useTranslations } from "use-intl";
import { useWastageReportById } from "@/hooks/use-wastage-report";
import { WastageReportForm } from "./wr-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าแก้ไข/ดูรายละเอียด wastage report ตาม id
 * โหลด entity ผ่าน useWastageReportById แล้วส่งเข้า WastageReportForm
 *
 * @param props - รับ params เป็น Promise ของ { id }
 * @param props.params - Promise ของ route parameters { id }
 * @returns คอมโพเนนต์หน้าแก้ไข WR
 * @example
 * // URL: /store-operation/wastage-reporting/abc-123
 * // params resolves to { id: "abc-123" }
 */
export function EditWastageReportContent({ id }: { id: string }) {
  const t = useTranslations("storeOperation.wastageReporting");
  const { data: wastageReport, isLoading, error, refetch } =
    useWastageReportById(id);

  if (isLoading) return <FormSkeleton />;
  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!wastageReport)
    return <ErrorState message={t("notFound")} />;

  return <WastageReportForm wastageReport={wastageReport} />;
}
