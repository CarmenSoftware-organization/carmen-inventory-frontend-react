import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/components/i18n-provider";
import { RouteErrorBoundaryAdapter } from "@/routes/module-error-boundary-adapter";

function Boom(): never {
  throw new Error("kaboom-test");
}

describe("RouteErrorBoundaryAdapter", () => {
  beforeEach(() => {
    localStorage.clear();
    // กัน error log ของ react-router รก console ระหว่างเทสต์
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders ModuleErrorBoundary with the thrown error message", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          ErrorBoundary: RouteErrorBoundaryAdapter,
          children: [{ index: true, Component: Boom }],
        },
      ],
      { initialEntries: ["/"] },
    );

    render(
      <I18nProvider>
        <RouterProvider router={router} />
      </I18nProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText(/kaboom-test/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
