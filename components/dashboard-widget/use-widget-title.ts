import { useCallback } from "react";
import { useLocale, useTranslations } from "use-intl";
import { resolveWidgetTitle, type WidgetTitleSource } from "./widget-title";

/**
 * ชื่อ dataset ตาม locale — คีย์คือ dataset_id ตรง ๆ (`dashboard.datasets.workflow.cn-pending-approval`)
 * use-intl อ่านจุดเป็น path ซ้อน ซึ่งตรงกับโครงของไฟล์แปล; dataset ที่ไม่มีคำแปล
 * (เช่นที่ promote จาก SQL Workbench) ใช้ชื่อจาก catalogue
 */
export function useDatasetLabel() {
  const t = useTranslations("dashboard.datasets");
  return useCallback(
    (datasetId: string, datasetName?: string) =>
      (t.has(datasetId) ? t(datasetId) : undefined) || datasetName || datasetId,
    [t],
  );
}

/** ฟังก์ชันเลือกชื่อ widget ตาม locale ปัจจุบัน — ดู `resolveWidgetTitle` */
export function useWidgetTitle() {
  const locale = useLocale();
  const t = useTranslations("dashboard.datasets");
  return useCallback(
    (widget: WidgetTitleSource, datasetName?: string) =>
      resolveWidgetTitle(widget, {
        locale,
        datasetName,
        translatedDatasetName: t.has(widget.dataset_id)
          ? t(widget.dataset_id)
          : undefined,
      }),
    [locale, t],
  );
}
