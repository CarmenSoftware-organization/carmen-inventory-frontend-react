import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  ChartOfAccount,
  CreateChartOfAccountDto,
} from "@/types/chart-of-accounts";

const crud = createConfigCrud<ChartOfAccount, CreateChartOfAccountDto>({
  queryKey: QUERY_KEYS.CHART_OF_ACCOUNTS,
  endpoint: API_ENDPOINTS.CHART_OF_ACCOUNTS,
  label: "account code",
  updateMethod: "PATCH",
});

export const useChartOfAccount = crud.useList;
export const useChartOfAccountAll = crud.useListAll;
export const useChartOfAccountById = crud.useById;
export const useCreateChartOfAccount = crud.useCreate;
export const useUpdateChartOfAccount = crud.useUpdate;
export const useDeleteChartOfAccount = crud.useDelete;
