import type { ReactNode } from "react";
import { useTranslations } from "use-intl";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AuditCell } from "@/components/share/audit-cell";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { SR_STATUS_CONFIG } from "@/constant/store-requisition";
import type { StoreRequisition } from "@/types/store-requisition";

interface SrCardProps {
  readonly item: StoreRequisition;
  readonly onEdit: (item: StoreRequisition) => void;
  readonly onDelete: (item: StoreRequisition) => void;
}

/**
 * แถวข้อมูล label/value ในการ์ด — label ชิดซ้าย ค่าชิดขวา ตัดบรรทัดได้
 * (ไม่ truncate เพราะข้อมูลต้องครบเท่าตาราง)
 */
function InfoRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <div className="min-w-0 text-end font-medium break-words">{children}</div>
    </div>
  );
}

/**
 * การ์ดแสดงรายการใบเบิกสินค้า 1 รายการสำหรับหน้ารายการ mobile/grid
 * คลิกหรือกด Enter เพื่อเข้าสู่หน้าแก้ไข
 *
 * ข้อมูลในการ์ดตรงกับคอลัมน์ของตาราง SR ทุกช่อง (เลขที่ · ประเภท · วันที่ ·
 * ต้นทาง→ปลายทาง · ผู้ขอ · แผนก · สถานะ · workflow/stage · created/updated)
 *
 * @param props.item - ข้อมูล StoreRequisition
 * @param props.onEdit - callback เมื่อคลิกการ์ด
 * @param props.onDelete - callback เมื่อกดปุ่มลบมุมล่างขวา
 * @returns คอมโพเนนต์การ์ด SR
 * @example
 * <SrCard item={sr} onEdit={(it) => navigate(`/.../${it.id}`)} onDelete={setDeleteTarget} />
 */
export default function SrCard({ item, onEdit, onDelete }: SrCardProps) {
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const { dateFormat, dateTimeFormat } = useProfile();

  const config = SR_STATUS_CONFIG[item.doc_status] ?? SR_STATUS_CONFIG.draft;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    onEdit(item);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onEdit(item);
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className="hover:border-primary/30 focus-visible:ring-ring cursor-pointer gap-0 overflow-hidden py-0 transition-colors focus-visible:ring-2"
    >
      {/* หัวการ์ด: เลขที่ + วันที่/ประเภท ซ้าย · สถานะขวา — badge เป็น size xs
          และ label แปลแล้ว (เหมือนคอลัมน์ Status ในตาราง) ของเดิมใช้ size sm
          ทับ text-xs + label UPPERCASE ดิบ ยาวเกินความกว้างการ์ด 4 คอลัมน์
          จนล้นออกนอกขอบ */}
      <CardHeader className="gap-0 px-3.5 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate text-sm">{item.sr_no}</CardTitle>
            <div className="text-muted-foreground mt-1 text-xs tabular-nums">
              {formatDate(item.sr_date, dateFormat)}
            </div>
          </div>
          <Badge className={config.className} size="xs">
            {ts(item.doc_status)}
          </Badge>
        </div>
      </CardHeader>

      <Separator />

      {/* flex-1 + content-start: การ์ดในกริดถูกยืดสูงเท่าใบที่สูงสุดของแถว ถ้า
          content ไม่กินที่ว่าง footer จะลอยค้างกลางการ์ดคนละระดับกัน (แถว
          workflow/created/updated มีไม่เท่ากันทุกใบ) — ให้ content อมที่ว่างไว้
          แล้วปุ่มลบจะติดก้นการ์ดตรงกันทุกใบ */}
      <CardContent className="grid flex-1 content-start gap-1.5 px-3.5 py-3 text-xs">
        {item.sr_type && (
          <InfoRow label={tfl("type")}>
            <span className="uppercase">{item.sr_type}</span>
          </InfoRow>
        )}
        <InfoRow label={tfl("fromTo")}>
          {item.from_location_name}
          {item.to_location_name && (
            <span className="text-muted-foreground font-normal">
              {" → "}
              {item.to_location_name}
            </span>
          )}
        </InfoRow>
        <InfoRow label={tfl("requester")}>{item.requestor_name}</InfoRow>
        <InfoRow label={tfl("department")}>{item.department_name}</InfoRow>
        {item.workflow_name && (
          <InfoRow label={tfl("workflowStage")}>{item.workflow_name}</InfoRow>
        )}
        {item.workflow_current_stage && (
          <InfoRow label={tfl("currentStage")}>
            {item.workflow_current_stage}
          </InfoRow>
        )}
        {item.audit?.created?.at && (
          <InfoRow label={tfl("created")}>
            <AuditCell
              entry={item.audit.created}
              dateTimeFormat={dateTimeFormat}
            />
          </InfoRow>
        )}
        {item.audit?.updated?.at && (
          <InfoRow label={tfl("updated")}>
            <AuditCell
              entry={item.audit.updated}
              dateTimeFormat={dateTimeFormat}
            />
          </InfoRow>
        )}
      </CardContent>

      <Separator />

      {/* ปุ่มลบมุมล่างขวา (idiom เดียวกับการ์ด config เช่น eco-card) — คลิกแล้ว
          ไม่เด้งเข้าหน้าแก้ไข เพราะ handleCardClick ข้าม target ที่เป็น button */}
      <CardFooter className="justify-end px-2 py-1.5">
        <Button
          type="button"
          variant="destructive"
          size="xs"
          aria-label={tc("delete")}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item);
          }}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  );
}
