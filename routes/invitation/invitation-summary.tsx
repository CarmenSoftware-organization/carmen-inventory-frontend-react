import { useTranslations } from "use-intl";
import type { InvitationPreview } from "@/lib/invitation-api";

/**
 * สรุปสิ่งที่ผู้ใช้ถูกเชิญ — ใช้ทุกแขนงของหน้ารับคำเชิญ
 *
 * อีเมลแสดงแบบปิดบังตามที่ backend ส่งมา ไม่มีที่ไหนในหน้านี้เห็นอีเมลเต็ม เพราะลิงก์คำเชิญ
 * ที่หลุดไปถึงคนอื่นต้องอ่านอีเมลของเจ้าตัวไม่ได้
 *
 * @param props.invitation - ข้อมูลคำเชิญที่อ่านมาจาก token
 */
export default function InvitationSummary({
  invitation,
}: {
  readonly invitation: InvitationPreview;
}) {
  const t = useTranslations("auth");

  return (
    <dl className="bg-muted/40 mt-5 rounded-xl px-4 py-3 text-xs">
      <div className="flex items-baseline justify-between gap-3 py-1">
        <dt className="text-muted-foreground">{t("invitation.cluster")}</dt>
        <dd className="text-right font-semibold">{invitation.cluster_name}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-3 py-1">
        <dt className="text-muted-foreground">{t("invitation.role")}</dt>
        <dd className="text-right font-semibold">{invitation.cluster_role}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-3 py-1">
        <dt className="text-muted-foreground">{t("invitation.sentTo")}</dt>
        <dd className="text-right font-semibold">{invitation.email_masked}</dd>
      </div>
      {invitation.business_units.length > 0 && (
        <div className="py-1">
          <dt className="text-muted-foreground">
            {t("invitation.businessUnits")}
          </dt>
          <dd className="mt-1 flex flex-col gap-0.5 font-semibold">
            {invitation.business_units.map((bu) => (
              <span key={bu.business_unit_id}>
                {bu.name} — {bu.role}
              </span>
            ))}
          </dd>
        </div>
      )}
    </dl>
  );
}
