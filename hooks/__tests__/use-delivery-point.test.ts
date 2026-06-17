import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import {
  useDeliveryPoint,
  useCreateDeliveryPoint,
  useUpdateDeliveryPoint,
  useDeleteDeliveryPoint,
} from "../use-delivery-point";
import type { DeliveryPoint } from "@/types/delivery-point";
import type { PaginatedResponse } from "@/types/params";

// Mock useProfile
vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ buCode: "BU001" }),
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

// Mock compat navigation
vi.mock("@/lib/compat/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { httpClient } from "@/lib/http-client";

const mockDeliveryPoints: DeliveryPoint[] = [
  {
    id: "1",
    doc_version: 1,
    name: "Main Warehouse",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    doc_version: 1,
    name: "Back Office",
    is_active: false,
    created_at: "2024-01-02T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
  },
];

const mockPaginatedResponse: PaginatedResponse<DeliveryPoint> = {
  data: mockDeliveryPoints,
  paginate: { total: 2, page: 1, perpage: 10, pages: 1 },
};

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

describe("useDeliveryPoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches delivery points successfully", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(
      new Response(JSON.stringify(mockPaginatedResponse), { status: 200 }),
    );

    const { result } = renderHook(() => useDeliveryPoint(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(2);
    expect(result.current.data?.data[0].name).toBe("Main Warehouse");
    expect(result.current.data?.paginate.total).toBe(2);
  });

  it("handles fetch error", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(
      new Response(null, { status: 500 }),
    );

    const { result } = renderHook(() => useDeliveryPoint(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe(
      "Failed to fetch delivery point",
    );
  });

  it("passes search params to the API", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(
      new Response(JSON.stringify(mockPaginatedResponse), { status: 200 }),
    );

    renderHook(() => useDeliveryPoint({ search: "warehouse", page: 1 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(httpClient.get).toHaveBeenCalledWith(
        expect.stringContaining("search=warehouse"),
      );
    });
  });
});

describe("useCreateDeliveryPoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a delivery point successfully", async () => {
    vi.mocked(httpClient.post).mockResolvedValue(
      new Response(JSON.stringify({ id: "3" }), { status: 201 }),
    );

    const { result } = renderHook(() => useCreateDeliveryPoint(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "New Point", is_active: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(httpClient.post).toHaveBeenCalledWith(
      expect.stringContaining("/delivery-points"),
      { name: "New Point", is_active: true },
    );
  });

  it("handles create error", async () => {
    vi.mocked(httpClient.post).mockResolvedValue(
      new Response(JSON.stringify({ message: "Name already exists" }), {
        status: 400,
      }),
    );

    const { result } = renderHook(() => useCreateDeliveryPoint(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Duplicate", is_active: true });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("Name already exists");
  });
});

describe("useUpdateDeliveryPoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a delivery point successfully", async () => {
    vi.mocked(httpClient.put).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    const { result } = renderHook(() => useUpdateDeliveryPoint(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: "1",
      name: "Updated Warehouse",
      is_active: false,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(httpClient.put).toHaveBeenCalledWith(
      expect.stringContaining("/delivery-points/1"),
      { name: "Updated Warehouse", is_active: false },
    );
  });
});

describe("useDeleteDeliveryPoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a delivery point successfully", async () => {
    vi.mocked(httpClient.delete).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    const { result } = renderHook(() => useDeleteDeliveryPoint(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(httpClient.delete).toHaveBeenCalledWith(
      expect.stringContaining("/delivery-points/1"),
    );
  });
});
