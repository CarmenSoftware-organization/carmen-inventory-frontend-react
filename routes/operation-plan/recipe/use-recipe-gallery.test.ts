import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
} from "vitest";
import { renderHook, act } from "@testing-library/react";
import { IMAGE_MAX_BYTES } from "@/lib/image-upload";
import { useRecipeGallery } from "./use-recipe-gallery";
import type { RecipeImage } from "@/types/recipe";

vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

import { toast } from "sonner";

// jsdom has no object-URL support — stub it.
beforeAll(() => {
  let n = 0;
  globalThis.URL.createObjectURL = vi.fn(() => `blob:mock-${n++}`);
  globalThis.URL.revokeObjectURL = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
});

const initialImages: RecipeImage[] = [
  { id: "a", url: "https://s/a", alt_text: "A", sort_order: 1, is_primary: false },
  { id: "b", url: "https://s/b", alt_text: null, sort_order: 0, is_primary: true },
];

const pngFile = (name = "x.png") => new File(["d"], name, { type: "image/png" });

describe("useRecipeGallery — initial state", () => {
  it("maps server images sorted by sort_order, primary flagged, not dirty", () => {
    const { result } = renderHook(() => useRecipeGallery(initialImages));

    expect(result.current.items.map((i) => i.id)).toEqual(["b", "a"]);
    expect(result.current.items[0].isPrimary).toBe(true);
    expect(result.current.items[1].isPrimary).toBe(false);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.canAddMore).toBe(true);
  });

  it("buildPayload of an untouched gallery yields id-only manifest and no files", () => {
    const { result } = renderHook(() => useRecipeGallery(initialImages));
    const payload = result.current.buildPayload();

    expect(payload.files).toEqual([]);
    expect(payload.count).toBe(2);
    expect(payload.isDirty).toBe(false);
    expect(payload.manifest).toEqual([
      { id: "b", is_primary: true },
      { id: "a", alt_text: "A" },
    ]);
  });
});

describe("useRecipeGallery — addFiles", () => {
  it("appends a new item and marks the gallery dirty", () => {
    const { result } = renderHook(() => useRecipeGallery(initialImages));
    const file = pngFile("c.png");

    act(() => result.current.addFiles([file]));

    expect(result.current.items).toHaveLength(3);
    expect(result.current.isDirty).toBe(true);
    const added = result.current.items[2];
    expect(added.id).toBeNull();
    expect(added.file).toBe(file);
    expect(added.isPrimary).toBe(false);
  });

  it("rejects gif (backend accepts only jpeg/png/webp)", () => {
    const { result } = renderHook(() => useRecipeGallery([]));

    act(() => result.current.addFiles([new File(["d"], "x.gif", { type: "image/gif" })]));

    expect(result.current.items).toHaveLength(0);
    expect(toast.error).toHaveBeenCalled();
  });

  it("rejects files larger than IMAGE_MAX_BYTES", () => {
    const { result } = renderHook(() => useRecipeGallery([]));
    const big = new File([new Uint8Array(IMAGE_MAX_BYTES + 1)], "big.png", {
      type: "image/png",
    });

    act(() => result.current.addFiles([big]));

    expect(result.current.items).toHaveLength(0);
    expect(toast.error).toHaveBeenCalled();
  });

  it("caps the gallery at 10 images", () => {
    const { result } = renderHook(() => useRecipeGallery([]));
    const files = Array.from({ length: 11 }, (_, i) => pngFile(`f${i}.png`));

    act(() => result.current.addFiles(files));

    expect(result.current.items).toHaveLength(10);
    expect(result.current.canAddMore).toBe(false);
    expect(toast.error).toHaveBeenCalled();
  });

  it("makes the first image primary when starting empty", () => {
    const { result } = renderHook(() => useRecipeGallery([]));

    act(() => result.current.addFiles([pngFile("1.png"), pngFile("2.png")]));

    expect(result.current.items[0].isPrimary).toBe(true);
    expect(result.current.items[1].isPrimary).toBe(false);
  });
});

describe("useRecipeGallery — setPrimary / remove / move", () => {
  it("setPrimary keeps exactly one primary", () => {
    const { result } = renderHook(() => useRecipeGallery(initialImages));

    act(() => result.current.setPrimary("a"));

    expect(result.current.items.find((i) => i.id === "a")?.isPrimary).toBe(true);
    expect(result.current.items.find((i) => i.id === "b")?.isPrimary).toBe(false);
    expect(result.current.isDirty).toBe(true);
  });

  it("removing the primary promotes the first remaining item", () => {
    const { result } = renderHook(() => useRecipeGallery(initialImages));

    act(() => result.current.remove("b")); // b was primary

    expect(result.current.items.map((i) => i.id)).toEqual(["a"]);
    expect(result.current.items[0].isPrimary).toBe(true);
    expect(result.current.isDirty).toBe(true);
  });

  it("move reorders items (sort_order = array order)", () => {
    const { result } = renderHook(() => useRecipeGallery(initialImages));

    act(() => result.current.move("b", 1)); // [b,a] -> [a,b]

    expect(result.current.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(result.current.isDirty).toBe(true);
  });

  it("move is a no-op (and not dirty) at the boundary", () => {
    const { result } = renderHook(() => useRecipeGallery(initialImages));

    act(() => result.current.move("b", -1)); // b already first

    expect(result.current.items.map((i) => i.id)).toEqual(["b", "a"]);
    expect(result.current.isDirty).toBe(false);
  });
});

describe("useRecipeGallery — buildPayload manifest", () => {
  it("references existing by id and new uploads by sequential file_index", () => {
    const { result } = renderHook(() => useRecipeGallery(initialImages));
    const file = pngFile("c.png");

    act(() => result.current.addFiles([file])); // b stays primary

    const payload = result.current.buildPayload();

    expect(payload.files).toEqual([file]);
    // order: b (id, primary), a (id), new (file_index 0)
    expect(payload.manifest).toEqual([
      { id: "b", is_primary: true },
      { id: "a", alt_text: "A" },
      { file_index: 0 },
    ]);
  });

  it("emits an empty manifest after removing every image (delete-all)", () => {
    const { result } = renderHook(() => useRecipeGallery(initialImages));

    act(() => result.current.remove("b"));
    act(() => result.current.remove("a"));

    const payload = result.current.buildPayload();
    expect(payload.count).toBe(0);
    expect(payload.manifest).toEqual([]);
    expect(payload.isDirty).toBe(true);
  });
});

describe("useRecipeGallery — reset", () => {
  it("restores the initial images and clears the dirty flag", () => {
    const { result } = renderHook(() => useRecipeGallery(initialImages));

    act(() => result.current.addFiles([pngFile("c.png")]));
    act(() => result.current.reset());

    expect(result.current.items.map((i) => i.id)).toEqual(["b", "a"]);
    expect(result.current.isDirty).toBe(false);
  });
});
