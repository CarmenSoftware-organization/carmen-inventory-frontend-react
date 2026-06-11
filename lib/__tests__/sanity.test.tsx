import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("vitest setup", () => {
  it("renders JSX with jsdom", () => {
    render(<button>ok</button>);
    expect(screen.getByRole("button", { name: "ok" })).toBeInTheDocument();
  });
});
