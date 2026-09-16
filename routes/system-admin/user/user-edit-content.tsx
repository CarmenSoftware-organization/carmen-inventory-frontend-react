import { useTranslations } from "use-intl";
import { useUserById } from "@/hooks/use-user";
import { UserAssignedForm } from "./user-assigned-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

export function UserEditContent({ id }: { id: string }) {
  const tErr = useTranslations("systemAdmin.user");
  const { data: user, isLoading, error, refetch } = useUserById(id);

  if (isLoading) return <FormSkeleton />;
  if (error || !user)
    return (
      <ErrorState
        error={error}
        notFoundMessage={tErr("notFound")}
        onRetry={() => refetch()}
        backTo="/system-admin/user"
      />
    );

  return <UserAssignedForm user={user} />;
}
