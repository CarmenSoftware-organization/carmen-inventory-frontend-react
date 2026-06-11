import { createBrowserRouter, Navigate } from "react-router";
import { RequireAuth } from "@/components/auth/require-auth";
import AppRoot from "./app-root";
import RootLayout from "./root-layout";
import { RouteErrorBoundaryAdapter } from "./module-error-boundary-adapter";

const ProtectedShell = () => (
  <RequireAuth>
    <RootLayout />
  </RequireAuth>
);

export const router = createBrowserRouter([
  {
    Component: AppRoot,
    children: [
      { path: "/login", lazy: () => import("./login/page") },
      {
        Component: ProtectedShell,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "dashboard", lazy: () => import("./dashboard/page") },
          {
            path: "config",
            ErrorBoundary: RouteErrorBoundaryAdapter,
            children: [
              { index: true, lazy: () => import("./config/page") },
              { path: "unit", lazy: () => import("./config/unit/page") },
              { path: "currency", lazy: () => import("./config/currency/page") },
              // ── config modules ถูกเพิ่มต่อท้ายตรงนี้ใน Batch B/C ──
            ],
          },
        ],
      },
      { path: "*", lazy: () => import("./not-found/page") },
    ],
  },
]);
