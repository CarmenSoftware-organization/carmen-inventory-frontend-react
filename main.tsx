import "./styles/globals.css";
import "./styles/badge-status.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";

const PRELOAD_RELOAD_KEY = "carmen.preload-reload";

/**
 * Self-heal stale lazy-chunk imports after a deploy that removed old hashed
 * assets. Every route is a `lazy:` module, so a deploy mid-session makes the
 * next navigation to an unvisited route fail its dynamic import — Vite fires
 * `vite:preloadError`. Reload once (guarded against reload loops) so the
 * session picks up the new asset manifest instead of hitting an error boundary.
 */
window.addEventListener("vite:preloadError", () => {
  try {
    if (sessionStorage.getItem(PRELOAD_RELOAD_KEY)) return;
    sessionStorage.setItem(PRELOAD_RELOAD_KEY, "1");
  } catch {
    // sessionStorage unavailable — reload anyway (worst case: one extra reload)
  }
  window.location.reload();
});

/**
 * Boot ลำดับ: config → restore session → render
 * refresh ก่อน render ตัดปัญหา flash ของ login page ตอน reload ขณะ logged-in
 */
async function boot() {
  try {
    const { loadRuntimeConfig } = await import("@/lib/runtime-config");
    await loadRuntimeConfig();

    const { refreshTokens } = await import("@/lib/auth/auth-api");
    await refreshTokens(); // ล้มเหลว = ไม่ logged-in → RequireAuth พาไป /login เอง

    const { router } = await import("./routes/router");
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    );
    // Successful boot — clear the reload guard so a future deploy can self-heal.
    try {
      sessionStorage.removeItem(PRELOAD_RELOAD_KEY);
    } catch {
      // ignore
    }
  } catch (error) {
    console.error("[boot] failed", error);
    document.getElementById("root")!.innerHTML =
      '<div style="font-family: system-ui; padding: 2rem; color: #b91c1c">Failed to load application configuration. Please try again or contact support.</div>';
  }
}

void boot();
