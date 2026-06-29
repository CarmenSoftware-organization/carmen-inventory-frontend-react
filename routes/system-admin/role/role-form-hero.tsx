
import { ArrowLeft, Pencil, Save, Shield, Trash2, X } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function RoleAvatar() {
  return (
    <div
      className="ring-background bg-primary text-primary-foreground flex size-16 shrink-0 items-center justify-center rounded-2xl ring-4"
      aria-hidden="true"
    >
      <Shield className="size-7" strokeWidth={2.25} />
    </div>
  );
}

interface RoleHeroProps {
  readonly name: string;
  readonly isNew: boolean;
  readonly isView: boolean;
  readonly canDelete: boolean;
  readonly isDeleting: boolean;
  readonly isSaving: boolean;
  readonly selectedPermissions: number;
  readonly totalPermissions: number;
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
  selectedPermissions,
  totalPermissions,
  onBack,
  onDelete,
  onEdit,
  onCancel,
}: RoleHeroProps) {
  const t = useTranslations("systemAdmin.role");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const displayName = name?.trim() || t("untitled");
  const ratio =
    totalPermissions > 0 ? selectedPermissions / totalPermissions : 0;
  const ratioPct = Math.round(ratio * 100);
  const ratioBucket = (() => {
    if (ratio === 0) return "none";
    if (ratio === 1) return "full";
    if (ratio >= 0.66) return "high";
    if (ratio >= 0.33) return "mid";
    return "low";
  })();
  const ratioColor: Record<typeof ratioBucket, string> = {
    none: "bg-muted-foreground/40",
    low: "bg-info",
    mid: "bg-warning",
    high: "bg-success",
    full: "bg-success",
  };

  return (
    <section className="border-border/60 bg-card relative overflow-hidden rounded-2xl border p-5">
      <div className="relative flex flex-wrap items-center gap-4">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={tc("goBack")}
          onClick={onBack}
        >
          <ArrowLeft />
        </Button>
        <RoleAvatar />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className={cn(
                "text-foreground text-lg font-semibold tracking-tight",
                !name?.trim() && "text-muted-foreground italic",
              )}
            >
              {displayName}
            </h2>
            <Badge
              variant={isNew ? "info-light" : "success-light"}
              size="xs"
              className="shrink-0"
            >
              ● {isNew ? t("statusDraft") : t("statusActive")}
            </Badge>
            <div className="ml-auto flex items-center gap-2">
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
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[0.6875rem]">
              <span className="text-muted-foreground">{t("coverage")}</span>
              <span className="text-foreground font-semibold tabular-nums">
                {selectedPermissions} / {totalPermissions}
                <span className="text-muted-foreground ml-1.5">
                  ({ratioPct}%)
                </span>
              </span>
            </div>
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  ratioColor[ratioBucket],
                )}
                style={{ width: `${ratioPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
