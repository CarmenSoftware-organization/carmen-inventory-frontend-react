import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { IntlProvider } from "use-intl";
import { useForm } from "react-hook-form";
import type { ReactNode } from "react";
import en from "@/messages/en.json";
import { ApiError } from "@/lib/api-error";
import { setRuntimeConfigForTests } from "@/lib/runtime-config";
import type { SrFormValues } from "./sr-form-schema";
import type { StoreRequisition } from "@/types/store-requisition";

/**
 * 422 ที่แปลว่า "ถามกลับ" ไม่ใช่ "พัง"
 *
 * backend ตีใบเบิกกลับด้วย `SR_DATE_PATTERN_REQUIRED` /
 * `SR_ISSUE_DATE_PATTERN_REQUIRED` เมื่อวันนี้อยู่นอกงวดบัญชีที่เปิดอยู่ทุกงวด
 * โดยตั้งใจให้ถามผู้ใช้แล้วยิงซ้ำพร้อมคำตอบ — ถ้าวันไหนโค้ดนี้กลายเป็น toast
 * เฉย ๆ ผู้ใช้จะตันสนิท กดกี่ครั้งก็ได้ 422 เดิม เทสต์นี้มีไว้กันวันนั้น
 */

const reportApiError = vi.fn();
vi.mock("@/lib/api-error-handler", () => ({
  reportApiError: (err: unknown) => reportApiError(err),
  skipsGlobalErrorToast: () => true,
}));

vi.mock("@/hooks/use-bu-code", () => ({ useBuCode: () => "BU1" }));

type MutateOpts = {
  onSuccess?: (res: unknown) => void;
  onError?: (err: unknown) => void;
};

function fakeMutation() {
  const payloads: Record<string, unknown>[] = [];
  return {
    payloads,
    isPending: false,
    mutate: vi.fn((payload: Record<string, unknown>, opts?: MutateOpts) => {
      payloads.push(payload);
      opts?.onSuccess?.({});
    }),
    mutateAsync: vi.fn(async () => ({ data: { id: "sr-1" } })),
  };
}

const approveSr = fakeMutation();
const otherMutation = fakeMutation();

vi.mock("./use-sr", () => ({
  useCreateStoreRequisition: () => otherMutation,
  useUpdateStoreRequisition: () => otherMutation,
  useSubmitStoreRequisition: () => otherMutation,
  useApproveStoreRequisition: () => approveSr,
  useIssueStoreRequisition: () => approveSr,
  useRejectStoreRequisition: () => otherMutation,
  useReviewStoreRequisition: () => otherMutation,
  useDeleteStoreRequisition: () => otherMutation,
}));

const { useSrFormActions } = await import("./use-sr-form-actions");

const catalogError = (appCode: string) =>
  new ApiError(
    "VALIDATION_ERROR",
    "dev fallback",
    422,
    false,
    undefined,
    "backend message",
    appCode,
  );

/** ตอบตามสคริปต์ทีละครั้ง — `null` = สำเร็จ */
function scriptApprove(script: (ApiError | null)[]) {
  approveSr.mutate.mockImplementation(
    (payload: Record<string, unknown>, opts?: MutateOpts) => {
      approveSr.payloads.push(payload);
      const err = script.shift();
      if (err) opts?.onError?.(err);
      else opts?.onSuccess?.({});
    },
  );
}

const storeRequisition = {
  id: "sr-1",
  sr_no: "SR-0001",
  doc_version: 3,
  store_requisition_detail: [{ id: "d1" }],
} as unknown as StoreRequisition;

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <IntlProvider locale="en" messages={en}>
        <MemoryRouter>{children}</MemoryRouter>
      </IntlProvider>
    </QueryClientProvider>
  );
}

function renderActions() {
  return renderHook(
    () => {
      const form = useForm<SrFormValues>({
        defaultValues: {
          items: [{ id: "d1", issued_qty: 2 }],
        } as unknown as SrFormValues,
      });
      return useSrFormActions({
        form,
        storeRequisition,
        defaultValues: { items: [] } as unknown as SrFormValues,
        mode: "view",
        setMode: () => {},
      });
    },
    { wrapper },
  );
}

beforeEach(() => {
  setRuntimeConfigForTests({ BACKEND_URL: "", X_APP_ID: "app-test" });
  reportApiError.mockClear();
  approveSr.mutate.mockReset();
  approveSr.payloads.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: storeRequisition }), { status: 200 }),
    ),
  );
});

describe("issue blocked by the open-period question", () => {
  it("asks instead of toasting, then retries with the answer", async () => {
    scriptApprove([catalogError("SR_ISSUE_DATE_PATTERN_REQUIRED"), null]);

    const { result } = renderActions();
    act(() => result.current.handleIssue());

    await waitFor(() =>
      expect(result.current.datePattern?.field).toBe("issue_date_pattern"),
    );
    expect(reportApiError).not.toHaveBeenCalled();

    act(() => result.current.datePattern?.retry("today"));

    expect(approveSr.payloads).toHaveLength(2);
    expect(approveSr.payloads[0]).not.toHaveProperty("issue_date_pattern");
    // doc_version เดิม — รอบที่ถูกตีกลับไม่ได้แตะใบ ไม่ต้องไปดึงใหม่
    expect(approveSr.payloads[1]).toMatchObject({
      issue_date_pattern: "today",
      doc_version: 3,
    });
    await waitFor(() => expect(result.current.datePattern).toBeNull());
  });

  it("still reports any other error the normal way", async () => {
    scriptApprove([catalogError("SR_NOT_FOUND")]);

    const { result } = renderActions();
    act(() => result.current.handleIssue());

    await waitFor(() => expect(reportApiError).toHaveBeenCalledTimes(1));
    expect(result.current.datePattern).toBeNull();
  });
});
