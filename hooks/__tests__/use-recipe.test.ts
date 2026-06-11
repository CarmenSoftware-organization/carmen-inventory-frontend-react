import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useCreateRecipe, useUpdateRecipe } from "../use-recipe";
import type { CreateRecipeVars, UpdateRecipeVars } from "@/types/recipe";
import { setRuntimeConfigForTests } from "@/lib/runtime-config";

vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ buCode: "BU001" }),
}));

vi.mock("@/lib/auth/auth-api", () => ({ refreshTokens: vi.fn() }));

// httpClient resolves URLs via runtime config; BACKEND_URL "" keeps the
// /api/proxy/... prefix stripped to /api/... so the URL assertions hold.
beforeEach(() => {
  setRuntimeConfigForTests({ BACKEND_URL: "", X_APP_ID: "app-test" });
});

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

/** Read multipart parts back from the FormData passed to fetch. */
function partsOf(fetchMock: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  const body = init.body as FormData;
  return { url, init, body };
}

const pngFile = (name: string) => new File(["data"], name, { type: "image/png" });

describe("useCreateRecipe (multipart)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: { id: "r1" } }), { status: 201 }),
      );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("POSTs data + images + gallery as multipart to the recipes endpoint", async () => {
    const file0 = pngFile("a.png");
    const file1 = pngFile("b.png");
    const { result } = renderHook(() => useCreateRecipe(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      code: "RCP-1",
      name: "Tom Yum",
      images: [file0, file1],
      gallery: [
        { file_index: 0, is_primary: true },
        { file_index: 1, alt_text: "side" },
      ],
    } as unknown as CreateRecipeVars);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const { url, init, body } = partsOf(fetchMock);
    expect(url).toContain("/api/config/BU001/recipes");
    expect(init.method).toBe("POST");
    // httpClient must not set Content-Type for FormData — the browser adds the
    // multipart boundary itself (it only attaches the x-app-id auth header).
    expect(
      (init.headers as Record<string, string>)["Content-Type"],
    ).toBeUndefined();

    const data = JSON.parse(body.get("data") as string);
    expect(data).toMatchObject({ code: "RCP-1", name: "Tom Yum" });
    // data part must not carry the multipart-only fields
    expect(data.images).toBeUndefined();
    expect(data.gallery).toBeUndefined();

    expect(body.getAll("images")).toEqual([file0, file1]);
    expect(JSON.parse(body.get("gallery") as string)).toEqual([
      { file_index: 0, is_primary: true },
      { file_index: 1, alt_text: "side" },
    ]);
  });

  it("omits gallery + images when none are provided", async () => {
    const { result } = renderHook(() => useCreateRecipe(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      code: "RCP-2",
      name: "Plain",
    } as unknown as CreateRecipeVars);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const { body } = partsOf(fetchMock);
    expect(body.get("data")).not.toBeNull();
    expect(body.get("gallery")).toBeNull();
    expect(body.getAll("images")).toHaveLength(0);
  });
});

describe("useUpdateRecipe (multipart full-sync)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("PATCHes to /recipes/:id and sends the full gallery manifest", async () => {
    const newFile = pngFile("new.png");
    const { result } = renderHook(() => useUpdateRecipe(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: "r1",
      code: "RCP-1",
      name: "Tom Yum",
      images: [newFile],
      gallery: [{ id: "img-keep", is_primary: true }, { file_index: 0 }],
    } as unknown as UpdateRecipeVars);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const { url, init, body } = partsOf(fetchMock);
    expect(url).toContain("/api/config/BU001/recipes/r1");
    expect(init.method).toBe("PATCH");
    expect(body.getAll("images")).toEqual([newFile]);
    expect(JSON.parse(body.get("gallery") as string)).toEqual([
      { id: "img-keep", is_primary: true },
      { file_index: 0 },
    ]);
  });

  it("omits gallery to keep existing images when the gallery is unchanged", async () => {
    const { result } = renderHook(() => useUpdateRecipe(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: "r1",
      name: "Renamed only",
    } as unknown as UpdateRecipeVars);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const { body } = partsOf(fetchMock);
    expect(body.get("gallery")).toBeNull();
    expect(body.getAll("images")).toHaveLength(0);
  });

  it("sends gallery: [] to delete all images", async () => {
    const { result } = renderHook(() => useUpdateRecipe(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: "r1",
      name: "Tom Yum",
      images: [],
      gallery: [],
    } as unknown as UpdateRecipeVars);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const { body } = partsOf(fetchMock);
    expect(JSON.parse(body.get("gallery") as string)).toEqual([]);
    expect(body.getAll("images")).toHaveLength(0);
  });

  it("surfaces the server error message on failure", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "file_index 3 is out of range" }), {
        status: 400,
      }),
    );
    const { result } = renderHook(() => useUpdateRecipe(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: "r1",
      name: "X",
      gallery: [],
    } as unknown as UpdateRecipeVars);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("file_index 3 is out of range");
  });
});
