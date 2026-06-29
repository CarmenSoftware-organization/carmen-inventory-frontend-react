
import { Building2, Crown } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { DepartmentRef } from "@/types/user";
import { EmptyState, SectionCard } from "./user-assigned-ui";

interface DepartmentsSectionProps {
  readonly memberDepartment: DepartmentRef | null;
  readonly hodDepartments: DepartmentRef[];
  readonly isLoading: boolean;
  readonly totalCount: number;
}

export function DepartmentsSection({
  memberDepartment,
  hodDepartments,
  isLoading,
  totalCount,
}: DepartmentsSectionProps) {
  const t = useTranslations("systemAdmin.user");
  return (
    <SectionCard
      icon={Building2}
      title={t("departmentsTitle")}
      count={totalCount || undefined}
    >
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-2/3 rounded-lg" />
        </div>
      ) : !memberDepartment && hodDepartments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={t("notAssigned")}
          desc={t("notAssignedDesc")}
        />
      ) : (
        <div className="space-y-4">
          {/* Member */}
          <div>
            <p className="text-muted-foreground mb-1.5 text-[0.625rem] font-semibold tracking-widest uppercase">
              Member of
            </p>
            {memberDepartment ? (
              <div className="border-border/60 bg-muted/20 flex items-center gap-2 rounded-lg border p-2 text-xs">
                <Building2
                  className="text-muted-foreground size-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-[0.6875rem] font-semibold">
                  {memberDepartment.code}
                </span>
                <span className="text-muted-foreground/60">·</span>
                <span>{memberDepartment.name}</span>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs italic">
                No primary department
              </p>
            )}
          </div>

          {/* HOD */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-muted-foreground text-[0.625rem] font-semibold tracking-widest uppercase">
                Head of Department
              </p>
              {hodDepartments.length > 0 && (
                <Badge variant="info-light" size="xs">
                  {hodDepartments.length} HOD
                </Badge>
              )}
            </div>
            {hodDepartments.length === 0 ? (
              <p className="text-muted-foreground text-xs italic">
                Not a head of any department
              </p>
            ) : (
              <div className="space-y-1.5">
                {hodDepartments.map((dept) => (
                  <div
                    key={dept.id}
                    className="border-border/60 bg-muted/20 flex items-center gap-2 rounded-lg border p-2 text-xs"
                  >
                    <Crown
                      className="text-warning size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-[0.6875rem] font-semibold">
                      {dept.code}
                    </span>
                    <span className="text-muted-foreground/60">·</span>
                    <span className="flex-1">{dept.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
