import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router";
import { useNavigationGuard } from "../use-navigation-guard";

function ListPage() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate("/detail")}>
      open detail
    </button>
  );
}

/** Mirrors a form page: dirty guard + its own toolbar Back that already asked. */
function DetailPage() {
  const guard = useNavigationGuard(true);
  return (
    <>
      <p>detail page</p>
      <button type="button" onClick={() => guard.back()}>
        toolbar back
      </button>
      {guard.isOpen && <p>guard dialog</p>}
    </>
  );
}

function renderApp() {
  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ListPage />} />
        <Route path="/detail" element={<DetailPage />} />
      </Routes>
    </BrowserRouter>,
  );
}

describe("useNavigationGuard — programmatic back", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("leaves the page without re-prompting when the caller already confirmed", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "open detail" }));
    expect(await screen.findByText("detail page")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "toolbar back" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "open detail" })).toBeInTheDocument(),
    );
    expect(screen.queryByText("guard dialog")).not.toBeInTheDocument();
  });
});
