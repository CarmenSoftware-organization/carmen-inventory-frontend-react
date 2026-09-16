import { useState } from "react";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmailTemplates } from "@/hooks/use-email-templates";
import { htmlToPlainText } from "@/lib/email-template";
import type { EmailTemplate } from "@/types/email-template";
import { EmailTemplateDialog } from "./email-template-dialog";

/**
 * หน้าตั้งค่าข้อความอีเมลของหน่วยธุรกิจ — สร้าง/แก้/ลบ และตั้งค่าเริ่มต้นต่อชนิดเอกสาร
 *
 * เก็บรวมเป็นอาเรย์เดียวใน app-config key `email_templates` (ไม่มี list endpoint
 * ไม่มี pagination) จึงใช้ตาราง HTML ธรรมดาเหมือนหน้าโปรไฟล์อีเมล
 *
 * ค่าเริ่มต้นแยกต่อชนิดเอกสาร — ตั้ง template ของ PO เป็นค่าเริ่มต้นไม่กระทบของ RFP
 */
export function Component() {
  const t = useTranslations("systemAdmin.emailTemplate");
  const tc = useTranslations("common");
  const tt = useTranslations("toast");

  const { value, isLoading, isError, save, isSaving } = useEmailTemplates();
  const { templates, defaults } = value;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null);

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleSave = (template: EmailTemplate) => {
    const isEdit = templates.some((x) => x.id === template.id);
    // ส่งทั้งชุดเสมอ — save เขียนทับ value ทั้งก้อน ไม่ใช่ partial update
    const nextTemplates = isEdit
      ? templates.map((x) => (x.id === template.id ? template : x))
      : [...templates, template];

    // ตัวแรกของชนิดเอกสารนั้น → เป็นค่าเริ่มต้นให้อัตโนมัติ
    const sameType = nextTemplates.filter(
      (x) => x.doc_type === template.doc_type,
    );
    const nextDefaults = { ...defaults };
    if (!defaults[template.doc_type] && sameType.length >= 1) {
      nextDefaults[template.doc_type] = sameType[0].id;
    }

    save(
      { defaults: nextDefaults, templates: nextTemplates },
      {
        onSuccess: () => {
          toast.success(
            isEdit
              ? tt("updateSuccess", { entity: t("entity") })
              : tt("createSuccess", { entity: t("entity") }),
          );
          setDialogOpen(false);
        },
      },
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const nextTemplates = templates.filter((x) => x.id !== deleteTarget.id);
    const nextDefaults = { ...defaults };
    if (defaults[deleteTarget.doc_type] === deleteTarget.id) {
      // ตัวที่เป็นค่าเริ่มต้นถูกลบ → เลื่อนให้ตัวที่เหลือของชนิดเดียวกันตัวแรก
      // (ไม่มีเหลือ = ไม่มีค่าเริ่มต้น dialog ส่งเอกสารจะให้เลือกเอง)
      nextDefaults[deleteTarget.doc_type] =
        nextTemplates.find((x) => x.doc_type === deleteTarget.doc_type)?.id ??
        null;
    }

    save(
      { defaults: nextDefaults, templates: nextTemplates },
      {
        onSuccess: () => {
          toast.success(tt("deleteSuccess", { entity: t("entity") }));
          setDeleteTarget(null);
        },
      },
    );
  };

  const handleSetDefault = (template: EmailTemplate) => {
    save(
      {
        defaults: { ...defaults, [template.doc_type]: template.id },
        templates,
      },
      {
        onSuccess: () =>
          toast.success(t("setDefaultSuccess", { name: template.name })),
      },
    );
  };

  return (
    <div className="mx-auto w-full max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{t("desc")}</p>
        </div>
        {!isError && !isLoading && (
          <Button size="sm" onClick={openAdd}>
            <Plus className="size-3.5" aria-hidden="true" />
            {t("add")}
          </Button>
        )}
      </header>

      {isError && <ErrorState message={t("loadError")} />}

      {!isError && isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {!isError && !isLoading && templates.length === 0 && (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      )}

      {!isError && !isLoading && templates.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted border-b">
              <tr>
                <th className="h-9 px-3 text-left font-medium">
                  {t("table.name")}
                </th>
                <th className="h-9 px-3 text-left font-medium">
                  {t("table.docType")}
                </th>
                <th className="h-9 px-3 text-left font-medium">
                  {t("table.subject")}
                </th>
                <th className="h-9 px-3 text-left font-medium">
                  {t("table.status")}
                </th>
                <th className="h-9 px-3 text-right font-medium">
                  {tc("rowActions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => {
                const isDefault = defaults[template.doc_type] === template.id;

                return (
                  <tr key={template.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{template.name}</span>
                        {isDefault && (
                          <Badge variant="success-light" size="xs">
                            {t("defaultBadge")}
                          </Badge>
                        )}
                      </div>
                      {template.note && (
                        <p className="text-muted-foreground mt-0.5 line-clamp-1">
                          {template.note}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {t(`docType.${template.doc_type}`)}
                    </td>
                    <td className="text-muted-foreground max-w-64 px-3 py-2">
                      <span className="line-clamp-1">
                        {template.subject_template ||
                          htmlToPlainText(template.body_template)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={template.enabled ? "default" : "secondary"}
                      >
                        {template.enabled
                          ? t("statusEnabled")
                          : t("statusDisabled")}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {!isDefault && (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleSetDefault(template)}
                            disabled={isSaving}
                          >
                            <Star className="size-3" aria-hidden="true" />
                            {t("setDefault")}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => {
                            setEditing(template);
                            setDialogOpen(true);
                          }}
                          aria-label={tc("edit")}
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleteTarget(template)}
                          aria-label={tc("delete")}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <EmailTemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={editing}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !isSaving && setDeleteTarget(null)}
        title={t("deleteTitle")}
        description={t("deleteConfirm", { name: deleteTarget?.name ?? "" })}
        isPending={isSaving}
        onConfirm={handleDelete}
      />
    </div>
  );
}
