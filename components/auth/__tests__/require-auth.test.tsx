import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { RequireAuth } from "@/components/auth/require-auth";
import { tokenStore } from "@/lib/auth/token-store";

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
  beforeEach(() => tokenStore.clear());

  it("redirects to /login without a token", () => {
    render(<App />);
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("renders children with a token", () => {
    tokenStore.set("at-1");
    render(<App />);
    expect(screen.getByText("secure content")).toBeInTheDocument();
  });
});
