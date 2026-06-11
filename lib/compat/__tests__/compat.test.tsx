import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import Link from "@/lib/compat/link";
import { usePathname, useRouter, useSearchParams } from "@/lib/compat/navigation";

function Probe() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  return (
    <div>
      <span data-testid="pathname">{pathname}</span>
      <span data-testid="q">{searchParams.get("q")}</span>
      <button onClick={() => router.push("/b")}>go</button>
    </div>
  );
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/a" element={<Probe />} />
        <Route path="/b" element={<div>page B</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("compat/navigation", () => {
  it("usePathname and useSearchParams mirror next/navigation", () => {
    renderAt("/a?q=hello");
    expect(screen.getByTestId("pathname")).toHaveTextContent("/a");
    expect(screen.getByTestId("q")).toHaveTextContent("hello");
  });

  it("router.push navigates", async () => {
    renderAt("/a");
    await userEvent.click(screen.getByRole("button", { name: "go" }));
    expect(screen.getByText("page B")).toBeInTheDocument();
  });
});

describe("compat/link", () => {
  it("renders an anchor from href and navigates on click", async () => {
    render(
      <MemoryRouter initialEntries={["/a"]}>
        <Routes>
          <Route path="/a" element={<Link href="/b">to B</Link>} />
          <Route path="/b" element={<div>page B</div>} />
        </Routes>
      </MemoryRouter>,
    );
    const anchor = screen.getByRole("link", { name: "to B" });
    expect(anchor).toHaveAttribute("href", "/b");
    await userEvent.click(anchor);
    expect(screen.getByText("page B")).toBeInTheDocument();
  });
});
