import { useTranslations } from "use-intl";
import { useUser } from "@/hooks/use-user";
import type { User } from "@/types/workflows";
import { EntityMultiFilter } from "./entity-multi-filter";

interface FilterRequesterProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
  /**
   * ชื่อคอลัมน์จริงใน DB ที่ clause จะชี้ — default `requestor_id` (สะกดตาม
   * schema ฝั่ง backend ไม่ใช่ requester) — PO ใช้ `created_by_id` กรองผู้จัดซื้อ
   */
  readonly fieldKey?: string;
  readonly label?: string;
}

function getUserFullName(user: User) {
  return [user.firstname, user.middlename, user.lastname]
    .filter(Boolean)
    .join(" ");
}

export function FilterRequester({
  value,
  onChange,
  className,
  fieldKey = "requestor_id",
  label,
}: FilterRequesterProps) {
  const tfl = useTranslations("field");
  return (
    <EntityMultiFilter<User>
      value={value}
      onChange={onChange}
      className={className}
      fieldKey={fieldKey}
      label={label || tfl("requester")}
      useListHook={useUser}
      getId={(u) => u.user_id}
      getLabel={getUserFullName}
      idFilterKey="user_id"
    />
  );
}
