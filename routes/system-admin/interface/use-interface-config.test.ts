import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useInterfaceConfig } from "./use-interface-config";

vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ buCode: "BU001" }),
}));

vi.mock("@/lib/http-client", () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { httpClient } from "@/lib/http-client";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

describe("useInterfaceConfig", () => {
  beforeEach(() => vi.clearAllMocks());

  it("treats 404 as a not-yet-configured interface, not an error", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: "Config key not found" }),
    } as Response);

    const { result } = renderHook(() => useInterfaceConfig("interface_pos"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isNew).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(result.current.value).toBeUndefined();
  });

  it("reports a server failure as an error", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: "boom" }),
    } as Response);

    const { result } = renderHook(() => useInterfaceConfig("interface_pos"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isNew).toBe(false);
  });

  it("exposes the stored value when the config exists", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { id: "1", key: "interface_pos", value: { enabled: true } },
      }),
    } as Response);

    const { result } = renderHook(() => useInterfaceConfig("interface_pos"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.value).toEqual({ enabled: true }));
    expect(result.current.isNew).toBe(false);
    expect(result.current.isError).toBe(false);
  });
});
