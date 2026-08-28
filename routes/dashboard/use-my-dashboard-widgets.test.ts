import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import {
  useCreateMyDashboardWidget,
  useMyDashboardWidgetData,
  useUpdateMyDashboardWidget,
} from "./use-my-dashboard-widgets";

// Mock useProfile — useBuCode อ่าน buCode มาจากตรงนี้
vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ buCode: "T02" }),
}));

// Mock httpClient
vi.mock("@/lib/http-client", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { httpClient } from "@/lib/http-client";

/**
 * สร้าง React wrapper สำหรับทดสอบ hook โดยให้ QueryClientProvider ใหม่ต่อการทดสอบ 1 ครั้ง
 * โดยปิด retry ของ query/mutation เพื่อไม่ให้เทสต์รอโดยไม่จำเป็น
 * @returns Wrapper component สำหรับใช้กับ renderHook
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  }
  return Wrapper;
}

const okJson = (data: unknown) => ({ ok: true, json: async () => ({ data }) });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useMyDashboardWidgetData", () => {
  it("ยิงด้วย widget id + scope=personal (ไม่ใช่ dataset_id)", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(
      okJson({ meta: { shape: "scalar" }, data: { value: 7 } }) as never,
    );

    const { result } = renderHook(() => useMyDashboardWidgetData("w-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(httpClient.get).toHaveBeenCalledWith(
      "/api/proxy/api/T02/dashboard-lab/widgets/w-123/data?scope=personal",
    );
    expect(result.current.data?.data).toEqual({ value: 7 });
  });

  it("ไม่ fetch เมื่อยังไม่มี widget id", () => {
    renderHook(() => useMyDashboardWidgetData(undefined), {
      wrapper: createWrapper(),
    });
    expect(httpClient.get).not.toHaveBeenCalled();
  });
});

describe("widget mutations carry params", () => {
  it("create ส่ง params ไปใน body", async () => {
    vi.mocked(httpClient.post).mockResolvedValue(
      okJson({ id: "w-1" }) as never,
    );

    const { result } = renderHook(() => useCreateMyDashboardWidget(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({
      dataset_id: "lab.pr-created-series",
      widget_type: "line",
      title: "PR series",
      params: { granularity: "month", days: 365 },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vi.mocked(httpClient.post).mock.calls[0][1]).toEqual({
      dataset_id: "lab.pr-created-series",
      widget_type: "line",
      title: "PR series",
      params: { granularity: "month", days: 365 },
    });
  });

  it("update ส่งเฉพาะ params (ไม่หลุด id เข้า body)", async () => {
    vi.mocked(httpClient.patch).mockResolvedValue(
      okJson({ id: "w-1" }) as never,
    );

    const { result } = renderHook(() => useUpdateMyDashboardWidget(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({ id: "w-1", params: { days: 7 } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vi.mocked(httpClient.patch).mock.calls[0][0]).toContain("w-1");
    expect(vi.mocked(httpClient.patch).mock.calls[0][1]).toEqual({
      params: { days: 7 },
    });
  });
});
