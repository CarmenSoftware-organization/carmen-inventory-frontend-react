import { Building2 } from "lucide-react";
import { useTranslations } from "use-intl";
import { Skeleton } from "@/components/ui/skeleton";
import type { DepartmentRef } from "@/types/user";
import { AssignSection, EmptyState } from "./user-assigned-ui";

interface DepartmentsSectionProps {
  readonly memberDepartment: DepartmentRef | null;
  readonly isLoading: boolean;
}

export function DepartmentsSection({
  memberDepartment,
  isLoading,
}: DepartmentsSectionProps) {
  const t = useTranslations("systemAdmin.user");
  return (
    <AssignSection
      title={t("departmentsTitle")}
      description={t("departmentsDesc")}
    >
      {isLoading ? (
        <Skeleton className="h-10 w-full rounded-lg" />
      ) : !memberDepartment ? (
        <EmptyState
          icon={Building2}
          title={t("notAssigned")}
          desc={t("notAssignedDesc")}
        />
      ) : (
        <div className="border-border/60 bg-muted/20 flex items-center gap-2 rounded-lg border p-2 text-xs">
          <Building2
            className="text-muted-foreground size-3.5 shrink-0"
            aria-hidden="true"
          />
          <span className="text-micro font-semibold">
            {memberDepartment.code}
          </span>
          <span className="text-muted-foreground/60">·</span>
          <span>{memberDepartment.name}</span>
        </div>
      )}
    </AssignSection>
  );
}
