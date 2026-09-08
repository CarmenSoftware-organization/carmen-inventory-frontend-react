import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useProcurementWidgets } from "../use-dashboard-widgets";

vi.mock("@/hooks/use-bu-code", () => ({
  useBuCode: () => "BU001",
}));

vi.mock("@/lib/http-client", () => ({
  httpClient: { get: vi.fn() },
}));

import { httpClient } from "@/lib/http-client";

const get = httpClient.get as ReturnType<typeof vi.fn>;

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function wrapper({ children }: { readonly children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

const CONFIG_URL =
  "/api/proxy/api/BU001/dashboard-widgets/procurement/config";
const BUNDLED_URL = "/api/proxy/api/BU001/dashboard-widgets/procurement";

describe("useProcurementWidgets", () => {
  beforeEach(() => {
    get.mockReset();
  });

  it("reads the config-only route", async () => {
    const items = [
      {
        module: "procurement",
        dataset_id: "workflow.pr-pending-approval",
        widget_type: "kpi",
        title: "PR pending",
        order_index: 0,
      },
    ];
    get.mockResolvedValueOnce(jsonResponse(200, { data: { items, count: 1 } }));

    const { result } = renderHook(() => useProcurementWidgets(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledWith(CONFIG_URL);
    expect(result.current.data?.items).toHaveLength(1);
  });

  // gateway ที่ยังไม่ได้ deploy route /config ตอบ 404 ของ Express — หน้าต้องไม่แดง
  it("falls back to the bundled route when /config is missing", async () => {
    const items = [
      {
        dataset_id: "workflow.pr-pending-approval",
        widget_type: "kpi",
        title: "PR pending",
        order_index: 0,
        meta: { id: "x", name: "PR pending", shape: "scalar", category: "workflow" },
        data: { value: 3 },
      },
    ];
    get
      .mockResolvedValueOnce(new Response("Cannot GET", { status: 404 }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { items, count: 1 } }));

    const { result } = renderHook(() => useProcurementWidgets(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenNthCalledWith(1, CONFIG_URL);
    expect(get).toHaveBeenNthCalledWith(2, BUNDLED_URL);
    // items ของ endpoint รวมพ่วง meta/data มาแล้ว → LazyWidget จะข้าม query ต่อใบ
    expect(result.current.data?.items[0].data).toEqual({ value: 3 });
  });

  it("surfaces a non-404 failure instead of falling back", async () => {
    get.mockResolvedValueOnce(jsonResponse(500, { message: "boom" }));

    const { result } = renderHook(() => useProcurementWidgets(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(get).toHaveBeenCalledTimes(1);
  });
});
