import { createBrowserRouter, Navigate } from "react-router";
import { RequireAuth } from "@/components/auth/require-auth";
import AppRoot from "./app-root";
import RootLayout from "./root-layout";

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
          // ── Module routes (config, procurement, …) ถูกเพิ่มตรงนี้ในเฟสถัดไป ──
        ],
      },
      { path: "*", lazy: () => import("./not-found/page") },
    ],
  },
]);
