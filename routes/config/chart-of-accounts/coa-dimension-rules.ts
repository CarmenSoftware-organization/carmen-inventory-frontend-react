import { httpClient } from "@/lib/http-client";
import { createConfigApi } from "@/lib/config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { fetchAllPages } from "@/lib/fetch-all-pages";
import { ApiError } from "@/lib/api-error";

export type DimensionRequirement = "mandatory" | "optional" | "prohibited";
export interface CoaDimensionRule {
  id: string;
  chart_of_accounts_id: string;
  gl_dimension_id: string;
  requirement: DimensionRequirement;
  doc_version: number;
}
export const coaRulesKey = (bu: string | undefined, id: string | undefined) => ["coa-dimension-rules", bu, id] as const;
const api = createConfigApi<CoaDimensionRule, { chart_of_accounts_id: string; gl_dimension_id: string; requirement: DimensionRequirement }>({
  endpoint: API_ENDPOINTS.GL_ACCOUNT_DIMENSION_RULES, label: "account dimension rules",
});
export async function readCoaRules(bu: string, id: string) {
  const rules = await fetchAllPages(async (page, perpage) => {
    const result = await api.getList(bu, { page, perpage, filter: `chart_of_accounts_id|string:${id}` });
    if (Array.isArray(result.data) && result.data.length === 0 && !result.paginate) {
      return { ...result, paginate: { total: 0, page, perpage, pages: 1 } };
    }
    if (!Array.isArray(result.data) || !result.paginate) throw new Error("Invalid account dimension rules response");
    return result;
  });
  return rules.filter((rule) => rule.chart_of_accounts_id === id);
}

async function checkSaved(response: Response) {
  if (!response.ok) throw await ApiError.from(response, "Unable to save dimension rule");
  if (response.status === 204) return;
  const body = await response.json();
  if (body?.success === false) throw new Error(body.message || "Unable to save dimension rule");
}

export async function saveCoaRules(bu: string, accountId: string, desired: Record<string, DimensionRequirement>) {
  // Re-read on retry: some operations may already have succeeded before an API error.
  const current = await readCoaRules(bu, accountId);
  for (const rule of current) {
    const requirement = desired[rule.gl_dimension_id];
    let response: Response | undefined;
    if (!requirement) response = await api.remove(bu, rule.id);
    else if (requirement !== rule.requirement) {
      response = await httpClient.put(`${API_ENDPOINTS.GL_ACCOUNT_DIMENSION_RULES(bu)}/${rule.id}`, { requirement, doc_version: rule.doc_version });
    }
    if (response) await checkSaved(response);
  }
  for (const [gl_dimension_id, requirement] of Object.entries(desired)) {
    if (current.some((rule) => rule.gl_dimension_id === gl_dimension_id)) continue;
    const response = await api.create(bu, { chart_of_accounts_id: accountId, gl_dimension_id, requirement });
    await checkSaved(response);
  }
}
