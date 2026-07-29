import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommentButton } from "../comment-button";

// t(key) → key
vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("CommentButton", () => {
  it("hides the count while it is still loading (count undefined)", () => {
    render(<CommentButton onClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: "comment" })).toBeInTheDocument();
  });

  it("hides the count when there are no comments", () => {
    render(<CommentButton count={0} onClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: "comment" })).toBeInTheDocument();
  });

  it("appends the count when there are comments", () => {
    render(<CommentButton count={3} onClick={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "comment (3)" }),
    ).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<CommentButton count={3} onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: "comment (3)" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
