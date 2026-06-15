import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { RedirectIfAuthed } from "@/components/auth/redirect-if-authed";
import { tokenStore } from "@/lib/auth/token-store";

const App = ({ entry = "/login" }: { entry?: string }) => (
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path="/dashboard" element={<div>dashboard page</div>} />
      <Route path="/reports" element={<div>reports page</div>} />
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <div>login form</div>
          </RedirectIfAuthed>
        }
      />
    </Routes>
  </MemoryRouter>
);

describe("RedirectIfAuthed", () => {
  beforeEach(() => tokenStore.clear());

  it("renders children without a token", () => {
    render(<App />);
    expect(screen.getByText("login form")).toBeInTheDocument();
  });

  it("redirects to /dashboard when a token is present", () => {
    tokenStore.set("at-1");
    render(<App />);
    expect(screen.getByText("dashboard page")).toBeInTheDocument();
  });

  it("redirects to a safe ?next= target when authed", () => {
    tokenStore.set("at-1");
    render(<App entry="/login?next=/reports" />);
    expect(screen.getByText("reports page")).toBeInTheDocument();
  });

  it("ignores an off-site ?next= and falls back to /dashboard", () => {
    tokenStore.set("at-1");
    render(<App entry="/login?next=//evil.com" />);
    expect(screen.getByText("dashboard page")).toBeInTheDocument();
  });
});
