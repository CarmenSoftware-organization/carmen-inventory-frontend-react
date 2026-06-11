import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useCreateEquipment, useUpdateEquipment } from "../use-equipment";
import type {
  CreateEquipmentVars,
  UpdateEquipmentVars,
} from "@/types/equipment";

vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ buCode: "BU001" }),
}));

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

function okResponse() {
  return new Response(JSON.stringify({ data: { id: "eq1" } }), { status: 201 });
}

/** Read multipart parts back from the FormData passed to fetch. */
function partsOf(fetchMock: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  const body = init.body as FormData;
  return { url, init, body };
}

const pngFile = () => new File(["data"], "oven.png", { type: "image/png" });

describe("useCreateEquipment (multipart)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("POSTs metadata + image as multipart to the recipe-equipment endpoint", async () => {
    const file = pngFile();
    const { result } = renderHook(() => useCreateEquipment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      code: "EQ-1",
      name: "Oven",
      image: file,
    } as unknown as CreateEquipmentVars);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const { url, init, body } = partsOf(fetchMock);
    expect(url).toContain("/api/config/BU001/recipe-equipment");
    expect(init.method).toBe("POST");
    // Must not set Content-Type — the browser adds the multipart boundary.
    expect(init.headers).toBeUndefined();

    const metadata = JSON.parse(body.get("metadata") as string);
    expect(metadata).toMatchObject({ code: "EQ-1", name: "Oven" });
    expect(metadata.image).toBeUndefined();
    expect(body.get("image")).toBe(file);
  });

  it("omits the image part when no file is provided", async () => {
    const { result } = renderHook(() => useCreateEquipment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      code: "EQ-2",
      name: "Mixer",
      image: null,
    } as unknown as CreateEquipmentVars);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const { body } = partsOf(fetchMock);
    expect(body.get("metadata")).not.toBeNull();
    expect(body.get("image")).toBeNull();
  });

  it("surfaces the server error message on failure", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "Code already exists" }), {
        status: 400,
      }),
    );
    const { result } = renderHook(() => useCreateEquipment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      code: "DUP",
      name: "X",
    } as unknown as CreateEquipmentVars);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Code already exists");
  });
});

describe("useUpdateEquipment (multipart)", () => {
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

  it("PATCHes to /recipe-equipment/:id and replaces the image when a file is attached", async () => {
    const file = pngFile();
    const { result } = renderHook(() => useUpdateEquipment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: "eq1",
      code: "EQ-1",
      name: "Oven",
      image: file,
      remove_image: false,
    } as unknown as UpdateEquipmentVars);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const { url, init, body } = partsOf(fetchMock);
    expect(url).toContain("/api/config/BU001/recipe-equipment/eq1");
    expect(init.method).toBe("PATCH");
    expect(body.get("image")).toBe(file);
    const metadata = JSON.parse(body.get("metadata") as string);
    expect(metadata.remove_image).toBe(false);
  });

  it("sends remove_image: true with no image part to delete the image", async () => {
    const { result } = renderHook(() => useUpdateEquipment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: "eq1",
      code: "EQ-1",
      name: "Oven",
      image: null,
      remove_image: true,
    } as unknown as UpdateEquipmentVars);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const { body } = partsOf(fetchMock);
    expect(body.get("image")).toBeNull();
    expect(JSON.parse(body.get("metadata") as string).remove_image).toBe(true);
  });
});
