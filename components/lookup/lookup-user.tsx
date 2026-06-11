
import { useState } from "react";
import { useTranslations } from "use-intl";
import { UserSearch } from "lucide-react";
import { useAllUsers } from "@/hooks/use-all-users";
import type { User } from "@/types/workflows";
import { LookupCombobox } from "./lookup-combobox";

/**
 * ฟังก์ชันช่วยเหลือ getUserFullName สำหรับ Lookup สำหรับเลือกผู้ใช้งานในระบบ
 * @param props - props ของ getUserFullName (ภาษาไทย)
 * @returns ผลลัพธ์ของฟังก์ชัน
 */
export function getUserFullName(user: User) {
  return [user.firstname, user.middlename, user.lastname]
    .filter(Boolean)
    .join(" ");
}

interface LookupUserProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onItemChange?: (user: User) => void;
  readonly excludeIds?: Set<string>;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly error?: string;
}

/**
 * Lookup Popover สำหรับเลือกผู้ใช้งานในระบบ (User)
 *
 * ดึงข้อมูลผ่าน `useAllUsers()` (client-side filter ไม่ใช้ pagination)
 * รองรับ `excludeIds` กัน duplicate (เช่นใน workflow approver list) และค้นหาด้วยชื่อ-email
 * มี `onItemChange` ส่ง object `User` เต็มสำหรับ side effects
 *
 * @param value - user_id ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่งเฉพาะ user_id
 * @returns JSX popover element ของ user lookup
 * @example
 * ```tsx
 * <Controller name="approver_id" control={control} render={({ field }) => (
 *   <LookupUser value={field.value} onValueChange={field.onChange} excludeIds={usedUserIds} />
 * )} />
 * ```
 */
export function LookupUser({
  value,
  onValueChange,
  onItemChange,
  excludeIds,
  disabled,
  placeholder,
  className,
  error,
}: LookupUserProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  // Lazy: โหลด user ทั้งหมดตอนเปิด popover ครั้งแรก หรือเมื่อมีค่าเลือกไว้แล้ว (resolve label)
  const [hasOpened, setHasOpened] = useState(false);
  const { data: allUsers = [], isLoading } = useAllUsers(hasOpened || !!value);

  const users = excludeIds
    ? allUsers.filter((u) => !excludeIds.has(u.user_id))
    : allUsers;

  return (
    <LookupCombobox
      value={value}
      onValueChange={(id, user) => {
        onValueChange(id);
        if (user) onItemChange?.(user);
      }}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={users}
      getId={(u) => u.user_id}
      getLabel={(u) => getUserFullName(u)}
      getSearchValue={(u) => `${getUserFullName(u)} ${u.email}`}
      placeholder={placeholder ?? tl("select", { entity: tfl("user") })}
      searchPlaceholder={tl("search", { entity: tfl("user") })}
      disabled={disabled}
      className={className}
      emptyIcon={UserSearch}
      emptyTitle={tl("noFound", { entity: tfl("user") })}
      emptyDescription={tl("noFoundDesc")}
      isLoading={isLoading}
      error={error}
    />
  );
}
