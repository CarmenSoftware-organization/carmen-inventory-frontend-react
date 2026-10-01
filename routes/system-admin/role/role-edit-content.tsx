import { useTranslations } from "use-intl";
import { useRoleById } from "../shared/use-role";
import { RoleForm } from "./role-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormPageSkeleton } from "@/components/loader/form-page-skeleton";

export function RoleEditContent({ id }: { id: string }) {
  const tErr = useTranslations("systemAdmin.role");
  const { data: role, isLoading, error, refetch } = useRoleById(id);

  if (isLoading) return <FormPageSkeleton />;
  if (error || !role)
    return (
      <ErrorState
        error={error}
        notFoundMessage={tErr("notFound")}
        onRetry={() => refetch()}
        backTo="/system-admin/role"
      />
    );

  return <RoleForm role={role} />;
}
