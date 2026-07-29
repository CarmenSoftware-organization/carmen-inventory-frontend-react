import { describe, it, expect } from "vitest";
import { createProductSchema } from "./product";

// identity translator — the schema only needs a function that returns a string
const t = (key: string) => key;

describe("createProductSchema — code is optional", () => {
  it("accepts a missing code (add mode sends none)", () => {
    const schema = createProductSchema(t, t);
    expect(schema.shape.code.safeParse(undefined).success).toBe(true);
  });

  it("accepts an empty-string code", () => {
    const schema = createProductSchema(t, t);
    expect(schema.shape.code.safeParse("").success).toBe(true);
  });

  it("still accepts a provided code (edit mode carries the server value)", () => {
    const schema = createProductSchema(t, t);
    expect(schema.shape.code.safeParse("P001").success).toBe(true);
  });
});
