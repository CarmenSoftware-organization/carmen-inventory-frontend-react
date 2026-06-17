import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import {
  useCnReason,
  useCreateCnReason,
  useUpdateCnReason,
  useDeleteCnReason,
} from "../use-cn-reason";
import type { CnReason } from "@/types/cn-reason";
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
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock compat navigation
vi.mock("@/lib/compat/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { httpClient } from "@/lib/http-client";

const mockCnReasons: CnReason[] = [
  {
    id: "1",
    doc_version: 1,
    name: "Damaged Goods",
    description: "Items received in damaged condition",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    doc_version: 1,
    name: "Wrong Item",
    description: "Incorrect item delivered",
    is_active: true,
    created_at: "2024-01-02T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
  },
];

const mockPaginatedResponse: PaginatedResponse<CnReason> = {
  data: mockCnReasons,
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

describe("useCnReason", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches credit note reasons successfully", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(
      new Response(JSON.stringify(mockPaginatedResponse), { status: 200 }),
    );

    const { result } = renderHook(() => useCnReason(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(2);
    expect(result.current.data?.data[0].name).toBe("Damaged Goods");
    expect(result.current.data?.paginate.total).toBe(2);
  });

  it("handles fetch error", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(
      new Response(null, { status: 500 }),
    );

    const { result } = renderHook(() => useCnReason(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe(
      "Failed to fetch credit note reason",
    );
  });

  it("passes search params to the API", async () => {
    vi.mocked(httpClient.get).mockResolvedValue(
      new Response(JSON.stringify(mockPaginatedResponse), { status: 200 }),
    );

    renderHook(() => useCnReason({ search: "damaged", page: 1 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(httpClient.get).toHaveBeenCalledWith(
        expect.stringContaining("search=damaged"),
      );
    });
  });
});

describe("useCreateCnReason", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a credit note reason successfully", async () => {
    vi.mocked(httpClient.post).mockResolvedValue(
      new Response(JSON.stringify({ id: "3" }), { status: 201 }),
    );

    const { result } = renderHook(() => useCreateCnReason(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      name: "Short Delivery",
      description: "Quantity received is less than ordered",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(httpClient.post).toHaveBeenCalledWith(
      expect.stringContaining("/credit-note-reasons"),
      {
        name: "Short Delivery",
        description: "Quantity received is less than ordered",
      },
    );
  });

  it("handles create error", async () => {
    vi.mocked(httpClient.post).mockResolvedValue(
      new Response(JSON.stringify({ message: "Name already exists" }), {
        status: 400,
      }),
    );

    const { result } = renderHook(() => useCreateCnReason(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      name: "Damaged Goods",
      description: "",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("Name already exists");
  });
});

describe("useUpdateCnReason", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a credit note reason successfully", async () => {
    vi.mocked(httpClient.patch).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    const { result } = renderHook(() => useUpdateCnReason(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: "1",
      name: "Updated Reason",
      description: "Updated description",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(httpClient.patch).toHaveBeenCalledWith(
      expect.stringContaining("/credit-note-reasons/1"),
      {
        name: "Updated Reason",
        description: "Updated description",
      },
    );
  });
});

describe("useDeleteCnReason", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a credit note reason successfully", async () => {
    vi.mocked(httpClient.delete).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    const { result } = renderHook(() => useDeleteCnReason(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(httpClient.delete).toHaveBeenCalledWith(
      expect.stringContaining("/credit-note-reasons/1"),
    );
  });
});
