import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { login, logout, refreshTokens } from "@/lib/auth/auth-api";
import { refreshTokenStorage } from "@/lib/auth/refresh-token-storage";
import { tokenStore } from "@/lib/auth/token-store";
import { setRuntimeConfigForTests } from "@/lib/runtime-config";

const okJson = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200 });

describe("auth-api", () => {
  beforeEach(() => {
    setRuntimeConfigForTests({ BACKEND_URL: "https://api.test", X_APP_ID: "app-1" });
    tokenStore.clear();
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("login stores both tokens and returns platform_role", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okJson({
        data: {
          access_token: "at-1",
          refresh_token: "rt-1",
          expires_in: 900,
          platform_role: "user",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await login("a@b.com", "secret");

    expect(result.platform_role).toBe("user");
    expect(tokenStore.get()).toBe("at-1");
    expect(refreshTokenStorage.get()).toBe("rt-1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.test/api/auth/login");
    expect((init.headers as Record<string, string>)["x-app-id"]).toBe("app-1");
  });

  it("login throws ApiError with backend message on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Invalid credentials" }), { status: 401 }),
      ),
    );
    await expect(login("a@b.com", "bad")).rejects.toThrow("Invalid credentials");
    expect(tokenStore.get()).toBeNull();
  });

  it("refreshTokens returns false without stored refresh token (no network call)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await refreshTokens()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshTokens rotates tokens on success", async () => {
    refreshTokenStorage.set("rt-1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okJson({ data: { access_token: "at-2", refresh_token: "rt-2", expires_in: 900 } }),
      ),
    );
    expect(await refreshTokens()).toBe(true);
    expect(tokenStore.get()).toBe("at-2");
    expect(refreshTokenStorage.get()).toBe("rt-2");
  });

  it("refreshTokens clears the session on backend rejection", async () => {
    refreshTokenStorage.set("rt-1");
    tokenStore.set("at-1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 401 })),
    );
    expect(await refreshTokens()).toBe(false);
    expect(tokenStore.get()).toBeNull();
    expect(refreshTokenStorage.get()).toBeNull();
  });

  it("concurrent refreshTokens calls share one network request (mutex)", async () => {
    refreshTokenStorage.set("rt-1");
    const fetchMock = vi.fn().mockResolvedValue(
      okJson({ data: { access_token: "at-2", expires_in: 900 } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const [a, b] = await Promise.all([refreshTokens(), refreshTokens()]);
    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("logout clears session locally and fires backend logout", async () => {
    tokenStore.set("at-1");
    refreshTokenStorage.set("rt-1");
    const fetchMock = vi.fn().mockResolvedValue(okJson({}));
    vi.stubGlobal("fetch", fetchMock);
    await logout();
    expect(tokenStore.get()).toBeNull();
    expect(refreshTokenStorage.get()).toBeNull();
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.test/api/auth/logout");
  });
});
