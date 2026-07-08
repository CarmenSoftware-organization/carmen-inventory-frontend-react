
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { useBuCode } from "@/hooks/use-bu-code";
import { useCreateWorkflow, useUpdateWorkflow } from "@/hooks/use-workflow";
import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import type { Workflow, WorkflowDto } from "@/types/workflows";
import {
  getWorkflowFormDefaults,
  type WorkflowCreateModel,
} from "./wf-form-schema";

interface MutateOptions<T> {
  readonly mutate: (
    payload: T,
    cb: { onSuccess: () => void; onError: (err: Error) => void },
  ) => void;
}

const runMutation = <T>(
  mutation: MutateOptions<T>,
  payload: T,
  successMessage: string,
): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success(successMessage);
        resolve();
      },
      onError: (err: Error) => {
        toast.error(err.message);
        reject(err);
      },
    });
  });

export function useWfRowMutations() {
  const buCode = useBuCode();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const updateWorkflow = useUpdateWorkflow();
  const createWorkflow = useCreateWorkflow();
  const t = useTranslations("systemAdmin.workflow");

  const fetchDetail = async (id: string): Promise<Workflow> => {
    if (!buCode) throw new Error("Missing buCode");
    const res = await httpClient.get(
      `${API_ENDPOINTS.WORKFLOWS(buCode)}/${id}`,
    );
    if (!res.ok) throw new Error("Failed to fetch workflow");
    const json = await res.json();
    return json.data as Workflow;
  };

  const handle = async <T>(
    workflow: WorkflowDto,
    runner: (detail: Workflow) => Promise<T>,
  ) => {
    try {
      setPendingId(workflow.id);
      const detail = await fetchDetail(workflow.id);
      await runner(detail);
    } catch (err) {
      if (err instanceof Error) toast.error(err.message);
    } finally {
      setPendingId(null);
    }
  };

  const toggleActive = (workflow: WorkflowDto) =>
    handle(workflow, async (detail) => {
      const next = !workflow.is_active;
      const defaults = getWorkflowFormDefaults(detail);
      const payload: WorkflowCreateModel & { id: string; doc_version?: number } = {
        ...defaults,
        id: workflow.id,
        is_active: next,
        // detail is freshly GET-fetched above — its doc_version is current
        doc_version: detail.doc_version,
      };
      await runMutation(
        updateWorkflow,
        payload,
        next ? t("activateSuccess") : t("deactivateSuccess"),
      );
    });

  const duplicate = (workflow: WorkflowDto) =>
    handle(workflow, async (detail) => {
      const defaults = getWorkflowFormDefaults(detail);
      const payload: WorkflowCreateModel = {
        ...defaults,
        id: crypto.randomUUID(),
        name: `${detail.name} ${t("copySuffix")}`,
      };
      await runMutation(createWorkflow, payload, t("duplicateSuccess"));
    });

  return { pendingId, toggleActive, duplicate };
}
