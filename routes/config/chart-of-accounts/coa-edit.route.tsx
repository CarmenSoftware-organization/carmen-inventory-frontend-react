import { useParams } from "react-router";
import { FormSkeleton } from "@/components/loader/form-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useChartOfAccountById } from "./use-coa";
import { CoaForm } from "./coa-form";

export function Component() {
  const { id } = useParams<{ id: string }>();
  const query = useChartOfAccountById(id);
  if (query.isLoading) return <FormSkeleton />;
  if (query.error || !query.data)
    return <ErrorState error={query.error} onRetry={() => query.refetch()} backTo="/config/chart-of-accounts" />;
  return <CoaForm account={query.data} />;
}
