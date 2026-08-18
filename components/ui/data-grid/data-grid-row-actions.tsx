
import { History, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dispatchPermissionDenied } from "@/components/permission-denied-dialog";
import { openActivity } from "@/components/share/activity-sheet-host";
import type { Permission } from "@/constant/permissions";
import { cn } from "@/lib/utils";

interface DataGridRowActionsProps {
  readonly onEdit?: () => void;
  readonly onDelete?: () => void;
  /** ถ้า true: Edit item ใน dropdown จะ dim + คลิกแล้วเด้ง permission dialog */
  readonly editDenied?: boolean;
  /** ถ้า true: Delete item ใน dropdown จะ dim + คลิกแล้วเด้ง permission dialog */
  readonly deleteDenied?: boolean;
  /** Permission codes สำหรับใช้ใน dispatch event เมื่อ denied */
  readonly editPermission?: Permission;
  readonly deletePermission?: Permission;
  /**
   * สัญญาหมดอายุ/ถูกระงับ (`!canWrite` จาก `useCan()`) — ต่างจาก `editDenied`/
   * `deleteDenied` (permission) ตรงที่ปิดจริง (Radix `disabled`, ไม่คลิกได้เลย
   * ไม่เด้ง dialog) พร้อม `title` อธิบาย เพราะแก้คนละวิธี (ต่ออายุ ไม่ใช่ขอสิทธิ์)
   * มาก่อน `editDenied`/`deleteDenied` เสมอเมื่อเป็น true พร้อมกัน
   */
  readonly writeDisabled?: boolean;
  /** Tooltip เมื่อ `writeDisabled` — ข้อความจาก `messages/*.json` namespace `license` */
  readonly writeDisabledTitle?: string;
  /**
   * เปิดเมนู Activity ของแถวนี้ — ไม่ส่ง = ไม่มีเมนู
   *
   * เปิดเฉพาะตารางที่ backend บันทึกกิจกรรมให้จริง (ดู activity-registry.ts ฝั่ง
   * micro-business) เปิดให้ตารางที่ไม่มีในทะเบียนจะได้เมนูที่กดแล้วว่างเปล่า
   */
  readonly activity?: { id: string; label?: string };
}

/**
 * Dropdown menu ของ row actions
 *
 * Render ปุ่มไอคอน MoreHorizontal เปิด dropdown ที่มีเมนู Edit, Activity และ
 * Delete (Delete ใช้ destructive variant) เมนูจะแสดงเฉพาะเมื่อมี callback หรือ
 * ข้อมูลที่ส่งเข้ามา และมี separator คั่นระหว่างกลุ่มที่มีจริงเท่านั้น
 *
 * @param props - props ของ component
 * @param props.onEdit - callback เมื่อกด Edit (optional)
 * @param props.onDelete - callback เมื่อกด Delete (optional)
 * @param props.activity - id/label ของแถวสำหรับเปิด activity sheet (optional)
 * @returns JSX element ของ action dropdown
 * @example
 * ```tsx
 * <DataGridRowActions
 *   onEdit={() => edit(item)}
 *   onDelete={() => del(item)}
 *   activity={{ id: item.id, label: item.code }}
 * />
 * ```
 */
export function DataGridRowActions({
  onEdit,
  onDelete,
  editDenied,
  deleteDenied,
  editPermission,
  deletePermission,
  writeDisabled,
  writeDisabledTitle,
  activity,
}: DataGridRowActionsProps) {
  const tc = useTranslations("common");
  const tActivity = useTranslations("activity");

  const handleEdit = writeDisabled
    ? undefined
    : editDenied
      ? () => dispatchPermissionDenied(editPermission)
      : onEdit;
  const handleDelete = writeDisabled
    ? undefined
    : deleteDenied
      ? () => dispatchPermissionDenied(deletePermission)
      : onDelete;

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" aria-label={tc("rowActions")}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onEdit && (
            <DropdownMenuItem
              className={cn(
                "cursor-pointer",
                (writeDisabled || editDenied) && "opacity-50",
              )}
              onClick={handleEdit}
              disabled={writeDisabled}
              title={writeDisabled ? writeDisabledTitle : undefined}
              aria-disabled={!writeDisabled && editDenied ? true : undefined}
            >
              <Pencil className="size-3" />
              {tc("edit")}
            </DropdownMenuItem>
          )}
          {onEdit && (activity || onDelete) && <DropdownMenuSeparator />}
          {activity && (
            <DropdownMenuItem
              className="cursor-pointer"
              // onSelect ไม่ใช่ onClick — Radix ต้องปิดเมนูและคืน focus ให้เสร็จ
              // ก่อน Sheet จะ mount ไม่งั้นสองตัวแย่ง focus กัน
              onSelect={() => openActivity(activity.id, activity.label)}
            >
              <History className="size-3" />
              {tActivity("title")}
            </DropdownMenuItem>
          )}
          {activity && onDelete && <DropdownMenuSeparator />}
          {onDelete && (
            <DropdownMenuItem
              onClick={handleDelete}
              variant={"destructive"}
              disabled={writeDisabled}
              title={writeDisabled ? writeDisabledTitle : undefined}
              aria-disabled={!writeDisabled && deleteDenied ? true : undefined}
              className={cn((writeDisabled || deleteDenied) && "opacity-50")}
            >
              <Trash2 className="text-destructive" />
              {tc("delete")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
