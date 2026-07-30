import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useActivityLogByRecord } from "../use-activity-log";
import type { ActivityLog } from "@/types/activity-log";
import type { PaginatedResponse } from "@/types/params";

vi.mock("@/hooks/use-bu-code", () => ({
  useBuCode: () => "BU001",
}));

vi.mock("@/lib/http-client", () => ({
  httpClient: { get: vi.fn() },
}));

import { httpClient } from "@/lib/http-client";

const PR_ID = "9f1c0f34-0000-4000-8000-000000000001";

/** params ต้องเป็น object เดิมทุก render ไม่งั้น queryKey เปลี่ยนเอง — ไม่ใช่เพราะ sheet เปิด/ปิด */
const PARAMS = { perpage: 50 } as const;

/**
 * สร้าง response ของ list activity log 1 รายการ ใช้แยกว่าเป็นการยิงรอบไหน
 * @param action - action ของ log ที่จะคืนกลับมา
 * @returns Response ที่ mock ให้ httpClient.get
 */
function logResponse(action: string): Response {
  const body: PaginatedResponse<ActivityLog> = {
    data: [{ id: `log-${action}`, action } as ActivityLog],
    paginate: { total: 1, page: 1, perpage: 50, pages: 1 },
  };
  return new Response(JSON.stringify(body), { status: 200 });
}

/**
 * สร้าง wrapper ที่มี QueryClient ใหม่ต่อ 1 เทสต์ ปิด retry เพื่อไม่ให้เทสต์รอเก้อ
 * ไม่ตั้ง staleTime ระดับ client เพื่อให้ค่าที่ hook ตั้งเองเป็นตัวตัดสิน
 * @returns Wrapper component สำหรับ renderHook
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return Wrapper;
}

describe("useActivityLogByRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ยังไม่ยิงเมื่อ sheet ปิดอยู่ (entityId undefined)", () => {
    renderHook(() => useActivityLogByRecord(undefined, PARAMS), {
      wrapper: createWrapper(),
    });

    expect(httpClient.get).not.toHaveBeenCalled();
  });

  it("ยิงตาม entityId ที่ส่งเข้ามา", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(logResponse("create"));

    const { result } = renderHook(
      () => useActivityLogByRecord(PR_ID, PARAMS),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(httpClient.get).toHaveBeenCalledTimes(1);
    expect(httpClient.get).toHaveBeenCalledWith(
      expect.stringContaining(`/activity-logs/record/${PR_ID}`),
    );
  });

  it("กดเปิดซ้ำทันทีก็ยิงใหม่ ไม่กิน cache เดิม", async () => {
    vi.mocked(httpClient.get).mockResolvedValueOnce(logResponse("create"));

    const { result, rerender } = renderHook(
      ({ id }: { id: string | undefined }) =>
        useActivityLogByRecord(id, PARAMS),
      { wrapper: createWrapper(), initialProps: { id: PR_ID as string | undefined } },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data[0].action).toBe("create");

    // ปิด sheet → เปิดใหม่ทันที (ยังไม่ถึง staleTime 1 นาทีของ CACHE_DYNAMIC)
    vi.mocked(httpClient.get).mockResolvedValueOnce(logResponse("update"));
    rerender({ id: undefined });
    rerender({ id: PR_ID });

    await waitFor(() =>
      expect(result.current.data?.data[0].action).toBe("update"),
    );
    expect(httpClient.get).toHaveBeenCalledTimes(2);
  });

  it("ตอนเปิดซ้ำยังเห็น list เดิมระหว่างรอของใหม่ ไม่กลับไปเป็น skeleton", async () => {
    vi.mocked(httpClient.get).mockResolvedValueOnce(logResponse("create"));

    const { result, rerender } = renderHook(
      ({ id }: { id: string | undefined }) =>
        useActivityLogByRecord(id, PARAMS),
      { wrapper: createWrapper(), initialProps: { id: PR_ID as string | undefined } },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    let resolveSecond: (value: Response) => void = () => {};
    vi.mocked(httpClient.get).mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveSecond = resolve;
      }),
    );
    rerender({ id: undefined });
    rerender({ id: PR_ID });

    await waitFor(() => expect(result.current.isFetching).toBe(true));
    // isLoading = ไม่มีข้อมูลเลย → sheet โชว์ skeleton; ที่นี่ยังมีของเดิมให้ดู
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data?.data[0].action).toBe("create");

    resolveSecond(logResponse("update"));
    await waitFor(() =>
      expect(result.current.data?.data[0].action).toBe("update"),
    );
  });
});
