import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import {
  useUploadUserSignature,
  useDeleteUserSignature,
} from "../use-profile";

vi.mock("@/lib/http-client", () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { httpClient } from "@/lib/http-client";

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

describe("useUploadUserSignature", () => {
  beforeEach(() => vi.clearAllMocks());

  it("posts a FormData with field 'signature'", async () => {
    vi.mocked(httpClient.post).mockResolvedValue(
      new Response(
        JSON.stringify({ file_token: "t", url: "u", expires_at: "e" }),
        { status: 200 },
      ),
    );
    const { result } = renderHook(() => useUploadUserSignature(), {
      wrapper: createWrapper(),
    });
    const file = new File(["x"], "signature.png", { type: "image/png" });
    result.current.mutate(file);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(httpClient.post).toHaveBeenCalledWith(
      "/api/proxy/api/user/profile/signature",
      expect.any(FormData),
    );
    const sentBody = vi.mocked(httpClient.post).mock.calls[0][1] as FormData;
    expect(sentBody.get("signature")).toBeInstanceOf(File);
  });

  it("throws ApiError on non-ok upload", async () => {
    vi.mocked(httpClient.post).mockResolvedValue(
      new Response(JSON.stringify({ message: "bad" }), { status: 400 }),
    );
    const { result } = renderHook(() => useUploadUserSignature(), {
      wrapper: createWrapper(),
    });
    result.current.mutate(new File(["x"], "s.png", { type: "image/png" }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("bad");
  });
});

describe("useDeleteUserSignature", () => {
  beforeEach(() => vi.clearAllMocks());

  it("issues DELETE to the signature endpoint", async () => {
    vi.mocked(httpClient.delete).mockResolvedValue(
      new Response(null, { status: 204 }),
    );
    const { result } = renderHook(() => useDeleteUserSignature(), {
      wrapper: createWrapper(),
    });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(httpClient.delete).toHaveBeenCalledWith(
      "/api/proxy/api/user/profile/signature",
    );
  });
});
