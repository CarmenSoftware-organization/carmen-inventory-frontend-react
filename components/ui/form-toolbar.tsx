import { useTranslations } from "use-intl";
import { History, Pencil, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openActivity } from "@/components/share/activity-sheet-host";
import { DocFormHeader } from "@/components/share/doc-form-header";
import { useCan } from "@/hooks/use-can";
import { usePermissionPrefix } from "@/hooks/use-permission-prefix";
import { dispatchPermissionDenied } from "@/components/permission-denied-dialog";
import { buildPermissionKey } from "@/constant/permissions";
import { cn } from "@/lib/utils";
import type { FormMode } from "@/types/form";

interface FormToolbarProps {
  readonly entity: string;
  readonly mode: FormMode;
  readonly formId: string;
  readonly isPending: boolean;
  readonly onBack: () => void;
  readonly onCancel: () => void;
  readonly onEdit?: () => void;
  readonly onDelete?: () => void;
  readonly deleteIsPending?: boolean;
  readonly subtitle?: string;
  readonly statusBadge?: React.ReactNode;
  readonly submitSlot?: React.ReactNode;
  readonly children?: React.ReactNode;
  readonly editTitle?: string;
  /**
   * Resource prefix สำหรับ guard ปุ่ม (ไม่ระบุ = ไม่ guard)
   * จะคำนวณ `{prefix}.create` (Save ใน add mode), `.update` (Edit + Save ใน edit mode), `.delete`
   */
  readonly permissionPrefix?: string;
  /**
   * ส่งต่อ `DocFormHeader.flush` — default true เพราะ consumer ของ FormToolbar
   * ทั้งหมด form body flush กับ container ของตัวเอง (centered card `p-4` /
   * full-width) ไม่มี px-4 เหมือน PR/PO จึงต้องให้ header flush ด้วยเพื่อ align
   */
  readonly flush?: boolean;
  /**
   * เปิดปุ่ม Activity ในแถบปุ่ม — ไม่ส่ง = ไม่มีปุ่ม (เช่นโหมด add ที่ยังไม่มี id)
   *
   * อยู่ที่ toolbar กลาง ไม่ให้แต่ละหน้ายัดปุ่มนี้เอง ทุกหน้าที่ใช้ toolbar นี้จะได้
   * ตำแหน่งเดียวกันเสมอ
   */
  readonly activity?: { id: string; label?: string };
}

export function FormToolbar({
  entity,
  mode,
  formId,
  isPending,
  onBack,
  onCancel,
  onEdit,
  onDelete,
  deleteIsPending = false,
  subtitle,
  statusBadge,
  submitSlot,
  children,
  editTitle,
  permissionPrefix,
  flush = true,
  activity,
}: FormToolbarProps) {
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const tActivity = useTranslations("activity");
  const tl = useTranslations("license");
  const { can, isAdmin, canWrite } = useCan();
  const autoPrefix = usePermissionPrefix();
  const prefix = permissionPrefix ?? autoPrefix;
  const isView = mode === "view";
  const isAdd = mode === "add";
  // สัญญาหมดอายุ/ถูกระงับ → ปิดปุ่มเขียนจริง (native disabled + title อธิบาย)
  // ต่างจาก saveDenied/editDenied/deleteDenied (permission) ที่ยังคลิกได้แล้ว
  // เด้ง dialog — license มาก่อนเสมอเพราะแก้คนละวิธี (ต่ออายุ ไม่ใช่ขอสิทธิ์)
  const writeDisabledTitle = !canWrite ? tl("writeDisabledTitle") : undefined;

  const title =
    mode === "add"
      ? tf("addTitle", { entity })
      : mode === "edit"
        ? (editTitle ?? tf("editTitle", { entity }))
        : entity;
  const submit = mode === "add" ? tc("create") : tc("save");
  const pending = mode === "add" ? tf("creating") : tf("saving");

  const savePermission = prefix
    ? buildPermissionKey(prefix, mode === "add" ? "create" : "update")
    : undefined;
  const updatePermission = prefix
    ? buildPermissionKey(prefix, "update")
    : undefined;
  const deletePermission = prefix
    ? buildPermissionKey(prefix, "delete")
    : undefined;

  const saveDenied = !!savePermission && !isAdmin && !can(savePermission);
  const editDenied = !!updatePermission && !isAdmin && !can(updatePermission);
  const deleteDenied = !!deletePermission && !isAdmin && !can(deletePermission);

  // ประกอบปุ่ม action ตาม mode แล้วส่งเข้า DocFormHeader.actions — layout (back
  // button, title align, gutter) อยู่ที่ DocFormHeader ที่เดียวทั้งแอป
  const actions = (
    <>
      {/* key + type="button" กัน React reuse DOM node ข้ามโหมด — ถ้าปุ่ม Edit
          กลายร่างเป็นปุ่ม type=submit ระหว่างคลิก ฟอร์มจะถูก submit ทันที
          (เจอจริงใน role-form-hero ตอนเติมปุ่ม Print หน้า Edit) */}
      {isView && onEdit ? (
        <Button
          key="edit"
          type="button"
          size="sm"
          variant="outline"
          onClick={
            !canWrite
              ? undefined
              : editDenied
                ? () => dispatchPermissionDenied(updatePermission)
                : onEdit
          }
          disabled={!canWrite}
          title={writeDisabledTitle}
          aria-disabled={canWrite && editDenied ? true : undefined}
          className={cn(canWrite && editDenied && "opacity-50")}
        >
          <Pencil />
          {tc("edit")}
        </Button>
      ) : !isView ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
          >
            <X />
            {tc("cancel")}
          </Button>
          {submitSlot ??
            (!canWrite ? (
              <Button
                type="button"
                size="sm"
                disabled
                title={writeDisabledTitle}
              >
                <Save />
                {submit}
              </Button>
            ) : saveDenied ? (
              <Button
                type="button"
                size="sm"
                onClick={() => dispatchPermissionDenied(savePermission)}
                aria-disabled
                className="opacity-50"
              >
                <Save />
                {submit}
              </Button>
            ) : (
              <Button
                type="submit"
                size="sm"
                form={formId}
                disabled={isPending}
              >
                <Save />
                {isPending ? pending : submit}
              </Button>
            ))}
        </>
      ) : null}
      {!isAdd && onDelete && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={
            !canWrite
              ? undefined
              : deleteDenied
                ? () => dispatchPermissionDenied(deletePermission)
                : onDelete
          }
          disabled={
            !canWrite || (!deleteDenied && (isPending || deleteIsPending))
          }
          title={writeDisabledTitle}
          aria-disabled={canWrite && deleteDenied ? true : undefined}
          className={cn(canWrite && deleteDenied && "opacity-50")}
        >
          <Trash2 />
          {tc("delete")}
        </Button>
      )}
      {/* ประวัติเป็นการ "ดู" อยู่ท้ายกลุ่มถัดจากปุ่มที่เปลี่ยนข้อมูล — ลำดับเดียว
          กับทุกหน้าเอกสารในแอป: Edit · Delete · Activity · Print */}
      {activity && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => openActivity(activity.id, activity.label)}
        >
          <History />
          {tActivity("title")}
        </Button>
      )}
      {children}
    </>
  );

  return (
    <DocFormHeader
      title={title}
      subtitle={subtitle}
      backLabel={tc("goBack")}
      onBack={onBack}
      badges={statusBadge}
      actions={actions}
      flush={flush}
    />
  );
}
