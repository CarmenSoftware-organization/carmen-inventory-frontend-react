import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { LazyWidget } from "../dashboard-widget-grid";
import type { SystemWidgetConfigItem } from "@/types/dashboard-widget";

vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/hooks/use-bu-code", () => ({
  useBuCode: () => "BU-001",
}));

// query options ปลอม — เก็บ `enabled` ไว้เช็คว่า gate ตาม viewport จริง
const mocks = vi.hoisted(() => ({
  queryFn: vi.fn(),
}));

vi.mock("@/hooks/use-dashboard-dataset", () => ({
  dashboardDatasetDataQueryOptions: (
    buCode: string | undefined,
    datasetId: string,
    enabled: boolean,
  ) => ({
    queryKey: ["dataset", buCode, datasetId],
    queryFn: mocks.queryFn,
    enabled,
  }),
}));

let observerCallback: IntersectionObserverCallback | null = null;
const disconnect = vi.fn();

class FakeIntersectionObserver {
  constructor(cb: IntersectionObserverCallback) {
    observerCallback = cb;
  }
  observe() {}
  unobserve() {}
  disconnect = disconnect;
}

const config: SystemWidgetConfigItem = {
  dataset_id: "workflow.pr-pending-approval",
  widget_type: "kpi",
  title: "PR pending",
  order_index: 0,
};

const payload = {
  meta: {
    id: "workflow.pr-pending-approval",
    name: "PR pending",
    shape: "scalar" as const,
    category: "workflow" as const,
  },
  data: { value: 42 },
};

function wrapper({ children }: { readonly children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const renderLazy = (item: SystemWidgetConfigItem = config) =>
  render(
    <LazyWidget config={item}>
      {(w) => <span>value:{(w.data as { value: number }).value}</span>}
    </LazyWidget>,
    { wrapper },
  );

describe("LazyWidget", () => {
  beforeEach(() => {
    observerCallback = null;
    mocks.queryFn.mockReset().mockResolvedValue(payload);
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    disconnect.mockClear();
  });

  it("holds the fetch until the card reaches the viewport", async () => {
    renderLazy();

    expect(mocks.queryFn).not.toHaveBeenCalled();

    await act(async () => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    await waitFor(() => expect(mocks.queryFn).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/value:42/)).toBeTruthy();
  });

  it("fetches immediately when IntersectionObserver is unavailable", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    renderLazy();

    await waitFor(() => expect(mocks.queryFn).toHaveBeenCalledTimes(1));
  });

  it("never fetches when the config already carries its payload", async () => {
    renderLazy({ ...config, meta: payload.meta, data: payload.data });

    expect(await screen.findByText(/value:42/)).toBeTruthy();
    await act(async () => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    expect(mocks.queryFn).not.toHaveBeenCalled();
  });

  it("drops only its own card when the dataset fails", async () => {
    mocks.queryFn.mockRejectedValue(new Error("dataset boom"));
    const { container } = renderLazy();

    await act(async () => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    await waitFor(() => expect(container.innerHTML).toBe(""));
  });
});
