import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useAppConfigs } from "../use-app-config";
import type { AppConfig } from "@/types/app-config";

vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ buCode: "BU001" }),
}));

vi.mock("@/lib/http-client", () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { httpClient } from "@/lib/http-client";

const rows: AppConfig[] = [
  {
    id: "1",
    key: "interface_pos",
    value: { enabled: true },
    created_at: null,
    created_by_id: null,
    updated_at: null,
    updated_by_id: null,
  },
];

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

describe("useAppConfigs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns every app config row for the current business unit", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({
      ok: true,
      json: async () => ({ data: rows }),
    } as Response);

    const { result } = renderHook(() => useAppConfigs(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(rows);
    expect(httpClient.get).toHaveBeenCalledWith(
      "/api/proxy/api/config/BU001/app-config",
    );
  });

  it("surfaces a failed request as an error", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: "boom" }),
    } as Response);

    const { result } = renderHook(() => useAppConfigs(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
