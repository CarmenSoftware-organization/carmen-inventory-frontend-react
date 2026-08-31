import { useTranslations } from "use-intl";
import { useAccountCode, useDeleteAccountCode } from "./use-account-code";
import type { AccountCode } from "@/types/account-code";
import { ConfigListTemplate } from "@/components/templates/config-list-template";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import { AcDialog } from "./ac-dialog";
import { useAcTable } from "./use-ac-table";
import { AC_FILTER_FIELDS } from "./ac-filter-fields";
import AcCard from "./ac-card";

/**
 * หน้ารายการรหัสบัญชี — master data ของรหัสบัญชีที่ระบบบัญชีปลายทางใช้ลงรายการ
 *
 * @returns React element ของหน้ารายการรหัสบัญชี
 * @example
 * // route: /config/account-code
 * <AcComponent />
 */
export default function AcComponent() {
  const t = useTranslations("config.accountCode");
  const tfl = useTranslations("field");
  const ts = useTranslations("status");

  return (
    <ConfigListTemplate<AccountCode>
      translationNamespace="config.accountCode"
      entityNameField="code"
      useList={useAccountCode}
      useDelete={useDeleteAccountCode}
      useTable={useAcTable}
      pageKey={LIST_PAGE_KEYS.ACCOUNT_CODE}
      filterFields={AC_FILTER_FIELDS}
      // ยังไม่ส่ง defaultSort — backend เพิ่งเปิด endpoint ยังไม่รู้ว่ารับ sort
      // ฟิลด์ไหนบ้าง ส่งไปมั่วแล้วเจอ 400 ทั้งหน้า ให้มันเรียงตาม default ของ
      // ฝั่งหลังบ้านไปก่อน ยืนยันแล้วค่อยใส่ `defaultSort="code:asc"`
      exportColumns={[
        { header: tfl("code"), value: (r) => r.code, width: 18 },
        { header: t("accountName"), value: (r) => r.description_1, width: 40 },
        {
          header: t("accountNameSecond"),
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
        <AcDialog
          open={open}
          onOpenChange={onOpenChange}
          accountCode={entity}
          readOnly={readOnly}
        />
      )}
      renderCard={({ item, onEdit, onDelete }) => (
        <AcCard item={item} onEdit={onEdit} onDelete={onDelete} />
      )}
    />
  );
}
