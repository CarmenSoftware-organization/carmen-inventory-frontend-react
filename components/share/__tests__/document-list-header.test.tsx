import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DocumentListHeader } from "../document-list-header";

describe("DocumentListHeader", () => {
  it("renders the title and description", () => {
    render(
      <DocumentListHeader title="Purchase Requests" description="All PRs" />,
    );
    expect(
      screen.getByRole("heading", { name: "Purchase Requests" }),
    ).toBeInTheDocument();
    expect(screen.getByText("All PRs")).toBeInTheDocument();
  });
});
