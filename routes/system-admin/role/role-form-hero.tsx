import { Pencil, Save, Trash2, X } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocFormHeader } from "@/components/share/doc-form-header";

interface RoleHeroProps {
  readonly name: string;
  readonly isNew: boolean;
  readonly isView: boolean;
  readonly canDelete: boolean;
  readonly isDeleting: boolean;
  readonly isSaving: boolean;
  readonly onBack: () => void;
  readonly onDelete: () => void;
  readonly onEdit: () => void;
  readonly onCancel: () => void;
}

export function RoleHero({
  name,
  isNew,
  isView,
  canDelete,
  isDeleting,
  isSaving,
  onBack,
  onDelete,
  onEdit,
  onCancel,
}: RoleHeroProps) {
  const t = useTranslations("systemAdmin.role");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const displayName = name?.trim() || t("untitled");

  const badges = (
    <Badge
      variant={isNew ? "info-light" : "success-light"}
      size="xs"
      className="shrink-0"
    >
      ● {isNew ? t("statusDraft") : t("statusActive")}
    </Badge>
  );

  const actions = (
    <>
      {canDelete && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={isDeleting}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          {tc("delete")}
        </Button>
      )}
      {isView ? (
        <Button size="sm" onClick={onEdit}>
          <Pencil />
          {tc("edit")}
        </Button>
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSaving}
          >
            <X className="size-3.5" aria-hidden="true" />
            {tc("cancel")}
          </Button>
          <Button
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
        badges={badges}
        actions={actions}
        flush
      />
    </section>
  );
}
