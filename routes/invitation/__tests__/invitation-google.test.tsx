import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "use-intl";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import { setRuntimeConfigForTests } from "@/lib/runtime-config";
import { tokenStore } from "@/lib/auth/token-store";
import type { InvitationPreview } from "@/lib/invitation-api";

const getInvitation = vi.hoisted(() => vi.fn());
vi.mock("@/lib/invitation-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/invitation-api")>()),
  getInvitation,
}));

import { Component as InvitationRoute } from "../invitation.route";

const preview = (overrides: Partial<InvitationPreview> = {}): InvitationPreview => ({
  cluster_name: "Hotel Group",
  cluster_role: "member",
  business_units: [{ business_unit_id: "bu-1", name: "Bangkok", role: "buyer" }],
  expires_at: "2099-01-01T00:00:00.000Z",
  email_masked: "j***@example.com",
  account_state: "free",
  has_account: false,
  ...overrides,
});

function renderInvitation(token = "tok-1") {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <IntlProvider locale="en" messages={en}>
        <MemoryRouter initialEntries={[`/invitations/${token}`]}>
          <Routes>
            <Route path="/invitations/:token" element={<InvitationRoute />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>
    </QueryClientProvider>,
  );
}

describe("invitation page — Google sign-in", () => {
  const originalLocation = window.location;
  const assign = vi.fn();

  beforeEach(() => {
    tokenStore.clear();
    setRuntimeConfigForTests({ BACKEND_URL: "https://api.test", X_APP_ID: "app-1" });
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign },
    });
    assign.mockClear();
  });
  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
    getInvitation.mockReset();
  });

  it.each(["free", "reclaimable", "owned"] as const)(
    "offers Google when the invited address is %s, returning to this invitation afterwards",
    async (state) => {
      getInvitation.mockResolvedValue(
        preview({ account_state: state, has_account: state === "owned" }),
      );
      renderInvitation("tok-1");

      await userEvent.click(
        await screen.findByRole("button", { name: /continue with google/i }),
      );

      const url = new URL(assign.mock.calls[0][0] as string);
      expect(url.searchParams.get("next")).toBe("/invitations/tok-1");
    },
  );

  it("encodes a token that contains reserved characters", async () => {
    getInvitation.mockResolvedValue(preview());
    renderInvitation("a%2Fb");

    await userEvent.click(
      await screen.findByRole("button", { name: /continue with google/i }),
    );

    const url = new URL(assign.mock.calls[0][0] as string);
    expect(url.searchParams.get("next")).toBe("/invitations/a%2Fb");
  });

  it("offers no Google button for an address that conflicts with another account's username", async () => {
    getInvitation.mockResolvedValue(preview({ account_state: "conflict" }));
    renderInvitation();

    await screen.findByText(/hotel group/i);

    expect(
      screen.queryByRole("button", { name: /continue with google/i }),
    ).not.toBeInTheDocument();
  });

  it("does not show the Google button once signed in: the page shows Accept instead", async () => {
    tokenStore.set("at-1");
    getInvitation.mockResolvedValue(preview({ account_state: "owned", has_account: true }));
    renderInvitation();

    await screen.findByRole("button", { name: /accept/i });

    expect(
      screen.queryByRole("button", { name: /continue with google/i }),
    ).not.toBeInTheDocument();
  });
});
