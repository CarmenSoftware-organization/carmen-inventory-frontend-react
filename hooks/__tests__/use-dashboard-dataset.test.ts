import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import {
  useDashboardDatasetPreview,
  useDashboardDatasets,
} from "../use-dashboard-dataset";

// Mock useProfile — useBuCode อ่าน buCode มาจากตรงนี้
vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ buCode: "T02" }),
}));

// Mock httpClient
vi.mock("@/lib/http-client", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
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
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return Wrapper;
}

const okJson = (data: unknown) => ({ ok: true, json: async () => ({ data }) });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useDashboardDatasets", () => {
  it("ยิงไป dashboard-lab เพราะเป็น endpoint เดียวที่แนบ params[] มาด้วย", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(
      okJson({ items: [], count: 0 }) as never,
    );

    const { result } = renderHook(() => useDashboardDatasets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(httpClient.get).toHaveBeenCalledWith(
      "/api/proxy/api/T02/dashboard-lab/datasets",
    );
  });

  it("unwrap json.data และคง params[] ที่ backend ส่งมา", async () => {
    const items = [
      { id: "lab.pr-created-series", name: "PR series", params: [{ name: "days" }] },
      { id: "product.total-active", name: "Active products", params: [] },
    ];
    vi.mocked(httpClient.get).mockResolvedValue(
      okJson({ items, count: 2 }) as never,
    );

    const { result } = renderHook(() => useDashboardDatasets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.count).toBe(2);
    expect(result.current.data?.items[0].params).toHaveLength(1);
    expect(result.current.data?.items[1].params).toEqual([]);
  });

  it("ไม่ fetch เมื่อ enabled=false (lazy picker)", () => {
    renderHook(() => useDashboardDatasets(false), { wrapper: createWrapper() });
    expect(httpClient.get).not.toHaveBeenCalled();
  });
});

describe("useDashboardDatasetPreview", () => {
  it("POST params ไปที่ exec endpoint ของ dataset นั้น", async () => {
    vi.mocked(httpClient.post).mockResolvedValue(
      okJson({ meta: { shape: "time_series" }, data: [] }) as never,
    );

    const params = { granularity: "month", days: 365 };
    const { result } = renderHook(
      () => useDashboardDatasetPreview("lab.pr-created-series", params),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(httpClient.post).toHaveBeenCalledWith(
      "/api/proxy/api/T02/dashboard-lab/datasets/lab.pr-created-series",
      { params },
    );
    expect(result.current.data?.meta.shape).toBe("time_series");
  });

  it("ไม่ fetch เมื่อยังไม่มี dataset id หรือ enabled=false", () => {
    type Props = { id?: string; on: boolean };
    const { rerender } = renderHook(
      ({ id, on }: Props) => useDashboardDatasetPreview(id, {}, on),
      {
        wrapper: createWrapper(),
        initialProps: { id: undefined, on: true } as Props,
      },
    );
    expect(httpClient.post).not.toHaveBeenCalled();

    rerender({ id: "lab.pr-count-recent", on: false });
    expect(httpClient.post).not.toHaveBeenCalled();
  });

  it("params ต่างกัน = คนละ cache entry (แก้ค่าแล้ว preview ยิงใหม่)", async () => {
    vi.mocked(httpClient.post).mockResolvedValue(
      okJson({ meta: { shape: "scalar" }, data: { value: 1 } }) as never,
    );
    const wrapper = createWrapper();

    const { result, rerender } = renderHook(
      ({ p }: { p: Record<string, string | number> }) =>
        useDashboardDatasetPreview("lab.pr-count-recent", p),
      { wrapper, initialProps: { p: { days: 30 } } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ p: { days: 365 } });
    await waitFor(() => expect(httpClient.post).toHaveBeenCalledTimes(2));
    expect(vi.mocked(httpClient.post).mock.calls[1][1]).toEqual({
      params: { days: 365 },
    });
  });
});
