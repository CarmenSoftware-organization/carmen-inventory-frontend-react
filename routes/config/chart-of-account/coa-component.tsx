import { useTranslations } from "use-intl";
import { useChartOfAccount, useDeleteChartOfAccount } from "./use-coa";
import type { ChartOfAccount } from "@/types/chart-of-account";
import { ConfigListTemplate } from "@/components/templates/config-list-template";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import { CoaDialog } from "./coa-dialog";
import { useCoaTable } from "./use-coa-table";
import { COA_FILTER_FIELDS } from "./coa-filter-fields";
import CoaCard from "./coa-card";

/**
 * หน้ารายการรหัสบัญชี — master data ของรหัสบัญชีที่ระบบบัญชีปลายทางใช้ลงรายการ
 *
 * @returns React element ของหน้ารายการรหัสบัญชี
 * @example
 * // route: /config/chart-of-account
 * <CoaComponent />
 */
export default function CoaComponent() {
  const t = useTranslations("config.chartOfAccount");
  const tfl = useTranslations("field");
  const ts = useTranslations("status");

  return (
    <ConfigListTemplate<ChartOfAccount>
      translationNamespace="config.chartOfAccount"
      entityNameField="code"
      useList={useChartOfAccount}
      useDelete={useDeleteChartOfAccount}
      useTable={useCoaTable}
      pageKey={LIST_PAGE_KEYS.CHART_OF_ACCOUNT}
      filterFields={COA_FILTER_FIELDS}
      // ยังไม่ส่ง defaultSort — backend เพิ่งเปิด endpoint ยังไม่รู้ว่ารับ sort
      // ฟิลด์ไหนบ้าง ส่งไปมั่วแล้วเจอ 400 ทั้งหน้า ให้มันเรียงตาม default ของ
      // ฝั่งหลังบ้านไปก่อน ยืนยันแล้วค่อยใส่ `defaultSort="code:asc"`
      exportColumns={[
        { header: tfl("code"), value: (r) => r.code, width: 18 },
        { header: t("accountName"), value: (r) => r.description_1, width: 40 },
        {
          header: tfl("description"),
          value: (r) => r.description_2 ?? "",
          width: 40,
        },
        {
          header: tfl("nature"),
          value: (r) => t(`nature.${r.nature}`),
          width: 12,
        },
        {
          header: tfl("type"),
          value: (r) => t(`accountType.${r.type}`),
          width: 22,
        },
        {
          header: tfl("status"),
          value: (r) => (r.is_active ? ts("active") : ts("inactive")),
          width: 10,
        },
      ]}
      renderDialog={({ open, onOpenChange, entity, readOnly }) => (
        <CoaDialog
          open={open}
          onOpenChange={onOpenChange}
          chartOfAccount={entity}
          readOnly={readOnly}
        />
      )}
      renderCard={({ item, onEdit, onDelete }) => (
        <CoaCard item={item} onEdit={onEdit} onDelete={onDelete} />
      )}
    />
  );
}
