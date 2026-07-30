import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { ListCard, ListCardRow } from "@/components/share/list-card";
import type { Role } from "@/types/role";

interface Props {
  readonly item: Role;
  readonly onEdit: (item: Role) => void;
  readonly onDelete?: (item: Role) => void;
}

/**
 * การ์ด role 1 รายการ สำหรับหน้ารายการโหมด grid/mobile
 *
 * ใช้ `ListCard` ตัวเดียวกับการ์ดทุกโมดูล · role ไม่มีสถานะ active/inactive
 * มุมขวาบนจึงเป็นจำนวนสิทธิ์ที่ role นี้ถืออยู่
 */
export default function RoleCard({ item, onEdit, onDelete }: Props) {
  const t = useTranslations("systemAdmin.role");
  const tfl = useTranslations("field");

  const permCount = item.permissions?.length ?? 0;

  return (
    <ListCard
      title={item.name || "..."}
      badge={
        <Badge variant="secondary" size="xs">
          <span className="tabular-nums">{permCount}</span> {t("permissions")}
        </Badge>
      }
      onOpen={() => onEdit(item)}
      onDelete={onDelete ? () => onDelete(item) : undefined}
    >
      {item.description && (
        <ListCardRow label={tfl("description")}>{item.description}</ListCardRow>
      )}
      <ListCardRow label={t("permissions")}>
        <span className="tabular-nums">{permCount}</span>
      </ListCardRow>
    </ListCard>
  );
}
