import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequireAuth } from "@/components/auth/require-auth";
import { tokenStore } from "@/lib/auth/token-store";
import { setRuntimeConfigForTests } from "@/lib/runtime-config";

const App = () => (
  <MemoryRouter initialEntries={["/secure"]}>
    <Routes>
      <Route path="/login" element={<div>login page</div>} />
      <Route
        path="/secure"
        element={
          <RequireAuth>
            <div>secure content</div>
          </RequireAuth>
        }
      />
    </Routes>
  </MemoryRouter>
);

describe("RequireAuth", () => {
  beforeEach(() => {
    tokenStore.clear();
    sessionStorage.clear();
    setRuntimeConfigForTests({ BACKEND_URL: "https://api.test", X_APP_ID: "app-1" });
  });

  it("renders children with a token", () => {
    tokenStore.set("at-1");
    render(<App />);
    expect(screen.getByText("secure content")).toBeInTheDocument();
  });

  it("without a token, tries a silent SSO check first instead of going straight to /login", () => {
    const hrefSpy = vi.fn();
    vi.stubGlobal("location", {
      pathname: "/secure",
      search: "",
      set href(value: string) {
        hrefSpy(value);
      },
    });

    render(<App />);

    expect(hrefSpy).toHaveBeenCalledTimes(1);
    const url = hrefSpy.mock.calls[0][0] as string;
    expect(url).toContain("https://api.test/api/auth/authorize");
    expect(url).toContain("silent=true");
    expect(url).toContain(encodeURIComponent("/secure"));
    expect(sessionStorage.getItem("carmen.silentSsoTried")).toBe("1");
    // Nothing rendered yet — the redirect above is a real navigation away from this page.
    expect(screen.queryByText("login page")).not.toBeInTheDocument();
    expect(screen.queryByText("secure content")).not.toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("without a token, falls back to /login once the silent check was already tried this tab session", () => {
    sessionStorage.setItem("carmen.silentSsoTried", "1");
    render(<App />);
    expect(screen.getByText("login page")).toBeInTheDocument();
  });
});
