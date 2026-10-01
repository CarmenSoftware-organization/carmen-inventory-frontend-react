import { StrictMode } from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { refreshTokenStorage } from "@/lib/auth/refresh-token-storage";
import { tokenStore } from "@/lib/auth/token-store";
import { Component as AuthCallback } from "../auth-callback.route";

function Where() {
  const location = useLocation();
  return <div data-testid="where">{`${location.pathname}${location.search}`}</div>;
}

function renderCallback() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/login/callback"]}>
        <Routes>
          <Route path="/login/callback" element={<AuthCallback />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const originalHash = window.location.hash;

describe("auth-callback route", () => {
  beforeEach(() => {
    tokenStore.clear();
    refreshTokenStorage.clear();
  });
  afterEach(() => {
    window.location.hash = originalHash;
  });

  it("stores both tokens from the fragment and goes to the dashboard", () => {
    window.location.hash = "#access_token=acc&refresh_token=rfr";

    renderCallback();

    expect(tokenStore.get()).toBe("acc");
    expect(refreshTokenStorage.get()).toBe("rfr");
    expect(screen.getByTestId("where")).toHaveTextContent("/dashboard");
  });

  it("returns to the deep link in `next` (e.g. an invitation page)", () => {
    window.location.hash =
      "#access_token=acc&refresh_token=rfr&next=%2Finvitations%2Ftok-1";

    renderCallback();

    expect(screen.getByTestId("where")).toHaveTextContent("/invitations/tok-1");
  });

  it("refuses an off-site `next` and falls back to the dashboard", () => {
    window.location.hash =
      "#access_token=acc&refresh_token=rfr&next=%2F%2Fevil.example.com";

    renderCallback();

    expect(screen.getByTestId("where")).toHaveTextContent("/dashboard");
  });

  it("goes back to /login with the generic Google error and stores nothing when tokens are missing", () => {
    window.location.hash = "#access_token=acc";

    renderCallback();

    expect(screen.getByTestId("where")).toHaveTextContent(
      "/login?error=google_failed",
    );
    expect(tokenStore.get()).toBeNull();
    expect(refreshTokenStorage.get()).toBeNull();
  });
});

describe("auth-callback route — hardening", () => {
  beforeEach(() => {
    tokenStore.clear();
    refreshTokenStorage.clear();
  });
  afterEach(() => {
    window.location.hash = originalHash;
  });

  it("removes the tokens from the address bar as soon as it has read them", () => {
    window.location.hash = "#access_token=acc&refresh_token=rfr";

    renderCallback();

    expect(window.location.hash).toBe("");
  });

  it("signs in once under StrictMode (effects run twice in dev) instead of bouncing to /login", () => {
    window.location.hash = "#access_token=acc&refresh_token=rfr";

    render(
      <StrictMode>
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter initialEntries={["/login/callback"]}>
            <Routes>
              <Route path="/login/callback" element={<AuthCallback />} />
              <Route path="*" element={<Where />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </StrictMode>,
    );

    expect(screen.getByTestId("where")).toHaveTextContent("/dashboard");
    expect(tokenStore.get()).toBe("acc");
  });

  it("clears every cached query from a previous user, not just the profile", () => {
    window.location.hash = "#access_token=acc&refresh_token=rfr";
    const client = new QueryClient();
    client.setQueryData(["some-other-users-data"], { secret: true });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/login/callback"]}>
          <Routes>
            <Route path="/login/callback" element={<AuthCallback />} />
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(client.getQueryData(["some-other-users-data"])).toBeUndefined();
  });
});
