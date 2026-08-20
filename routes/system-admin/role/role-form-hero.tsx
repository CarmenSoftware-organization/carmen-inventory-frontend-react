import { Pencil, Printer, Save, Trash2, X } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { DocFormHeader } from "@/components/share/doc-form-header";

interface RoleHeroProps {
  readonly name: string;
  readonly isView: boolean;
  readonly canDelete: boolean;
  readonly isDeleting: boolean;
  readonly isSaving: boolean;
  readonly onBack: () => void;
  readonly onDelete: () => void;
  readonly onEdit: () => void;
  readonly onCancel: () => void;
  readonly onPrint: () => void;
}

export function RoleHero({
  name,
  isView,
  canDelete,
  isDeleting,
  isSaving,
  onBack,
  onDelete,
  onEdit,
  onCancel,
  onPrint,
}: RoleHeroProps) {
  const t = useTranslations("systemAdmin.role");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const displayName = name?.trim() || t("untitled");

  const actions = (
    <>
      {/* key แยกตามหน้าที่ปุ่ม — กัน React reuse DOM node ข้ามโหมด (เคยเจอ:
          กด Edit แล้ว node เดิมกลายร่างเป็นปุ่ม Save type=submit ก่อน browser
          ประมวล default action ของคลิก → ฟอร์มถูก submit ทันที) */}
      {isView ? (
        <>
          <Button
            key="print"
            type="button"
            variant="secondary"
            size="sm"
            onClick={onPrint}
          >
            <Printer className="size-3.5" aria-hidden="true" />
            {tc("print")}
          </Button>
          <Button key="edit" type="button" size="sm" onClick={onEdit}>
            <Pencil />
            {tc("edit")}
          </Button>
        </>
      ) : (
        <>
          <Button
            key="cancel"
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={isSaving}
          >
            <X className="size-3.5" aria-hidden="true" />
            {tc("cancel")}
          </Button>
          <Button
            key="save"
            type="submit"
            size="sm"
            form="role-form"
            disabled={isSaving}
          >
            <Save className="size-3.5" aria-hidden="true" />
            {isSaving ? tf("saving") : tc("save")}
          </Button>
        </>
      )}
      {canDelete && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onDelete}
          disabled={isDeleting}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          {tc("delete")}
        </Button>
      )}
    </>
  );

  // card wrapper คง identity ของ hero (rounded border bg); DocFormHeader flush
  // เพราะ card p-4 จัด padding ให้แล้ว
  return (
    <section className="border-border/60 bg-card rounded-2xl border p-4">
      <DocFormHeader
        title={displayName}
        backLabel={tc("goBack")}
        onBack={onBack}
        actions={actions}
        flush
      />
    </section>
  );
}
