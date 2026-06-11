import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/changelog", () => ({
  CHANGELOG: {
    current: "1.0.0",
    generated_at: "2026-05-28T00:00:00.000Z",
    versions: [
      {
        version: "1.0.0",
        build: "1.0.0-build.20260528.abc1234",
        date: "2026-05-28",
        commit: "abc1234",
        changes: {
          added: [
            { scope: "news", summary: "add news image upload", hash: "deadbeef", author: "Jane Dev", pr: 111 },
          ],
          fixed: [
            { scope: null, summary: "fix timestamp", hash: "cafe0001", author: "John Dev", pr: 99 },
          ],
          changed: [],
        },
      },
    ],
  },
}));

import { WhatsNewDialog } from "@/components/footer/whats-new-dialog";

describe("WhatsNewDialog", () => {
  it("renders grouped summaries with scope, but hides hash/author/PR", () => {
    render(<WhatsNewDialog open onOpenChange={vi.fn()} />);

    expect(screen.getByText("add news image upload")).toBeInTheDocument();
    expect(screen.getByText("fix timestamp")).toBeInTheDocument();
    expect(screen.getByText("Added")).toBeInTheDocument();
    expect(screen.getByText("Fixed")).toBeInTheDocument();
    expect(screen.getByText("news")).toBeInTheDocument(); // scope chip

    // Empty section is omitted entirely
    expect(screen.queryByText("Changed")).not.toBeInTheDocument();

    // Technical detail is never rendered
    expect(screen.queryByText(/deadbeef/)).not.toBeInTheDocument();
    expect(screen.queryByText(/cafe0001/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Jane Dev/)).not.toBeInTheDocument();
    expect(screen.queryByText(/#111/)).not.toBeInTheDocument();
  });
});
