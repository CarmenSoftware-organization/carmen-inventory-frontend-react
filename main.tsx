import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./styles/globals.css";
import "./styles/badge-status.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";

/**
 * Boot ลำดับ: config → restore session → render
 * refresh ก่อน render ตัดปัญหา flash ของ login page ตอน reload ขณะ logged-in
 */
async function boot() {
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
}

void boot();
