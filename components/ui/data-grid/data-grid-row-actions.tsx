
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
}

/**
 * Dropdown menu ของ row actions
 *
 * Render ปุ่มไอคอน MoreHorizontal เปิด dropdown ที่มีเมนู Edit และ Delete
 * (Delete ใช้ destructive variant) เมนูจะแสดงเฉพาะเมื่อมี callback ที่ส่ง
 * เข้ามา และมี separator ระหว่าง Edit-Delete เมื่อมีทั้งคู่
 *
 * @param props - props ของ component
 * @param props.onEdit - callback เมื่อกด Edit (optional)
 * @param props.onDelete - callback เมื่อกด Delete (optional)
 * @returns JSX element ของ action dropdown
 * @example
 * ```tsx
 * <DataGridRowActions onEdit={() => edit(item)} onDelete={() => del(item)} />
 * ```
 */
export function DataGridRowActions({
  onEdit,
  onDelete,
  editDenied,
  deleteDenied,
  editPermission,
  deletePermission,
}: DataGridRowActionsProps) {
  const tc = useTranslations("common");

  const handleEdit = editDenied
    ? () => dispatchPermissionDenied(editPermission)
    : onEdit;
  const handleDelete = deleteDenied
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
              className={cn("cursor-pointer", editDenied && "opacity-50")}
              onClick={handleEdit}
              aria-disabled={editDenied || undefined}
            >
              <Pencil className="size-3" />
              {tc("edit")}
            </DropdownMenuItem>
          )}
          {onEdit && onDelete && <DropdownMenuSeparator />}
          {onDelete && (
            <DropdownMenuItem
              onClick={handleDelete}
              variant={"destructive"}
              aria-disabled={deleteDenied || undefined}
              className={cn(deleteDenied && "opacity-50")}
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
