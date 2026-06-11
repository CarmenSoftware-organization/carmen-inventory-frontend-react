import { beforeEach, describe, expect, it, vi } from "vitest";
import { refreshTokenStorage } from "@/lib/auth/refresh-token-storage";
import { tokenStore } from "@/lib/auth/token-store";

describe("tokenStore (in-memory access token)", () => {
  beforeEach(() => tokenStore.clear());

  it("stores and returns the access token", () => {
    tokenStore.set("abc");
    expect(tokenStore.get()).toBe("abc");
  });

  it("clear() empties the token", () => {
    tokenStore.set("abc");
    tokenStore.clear();
    expect(tokenStore.get()).toBeNull();
  });

  it("notifies subscribers on set and clear", () => {
    const listener = vi.fn();
    const unsubscribe = tokenStore.subscribe(listener);
    tokenStore.set("abc");
    tokenStore.clear();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    tokenStore.set("xyz");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe("refreshTokenStorage (localStorage adapter)", () => {
  beforeEach(() => localStorage.clear());

  it("persists and reads the refresh token", () => {
    refreshTokenStorage.set("rt-1");
    expect(refreshTokenStorage.get()).toBe("rt-1");
    expect(localStorage.getItem("carmen.refresh_token")).toBe("rt-1");
  });

  it("clear() removes the token", () => {
    refreshTokenStorage.set("rt-1");
    refreshTokenStorage.clear();
    expect(refreshTokenStorage.get()).toBeNull();
  });
});
