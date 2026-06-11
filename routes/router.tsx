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
              { path: "adjustment-type", lazy: () => import("./config/adjustment-type/page") },
              { path: "business-type", lazy: () => import("./config/business-type/page") },
              { path: "certification", lazy: () => import("./config/certification/page") },
              { path: "credit-note-reason", lazy: () => import("./config/credit-note-reason/page") },
              { path: "credit-term", lazy: () => import("./config/credit-term/page") },
              { path: "delivery-point", lazy: () => import("./config/delivery-point/page") },
              { path: "eco", lazy: () => import("./config/eco/page") },
              { path: "exchange-rate", lazy: () => import("./config/exchange-rate/page") },
              { path: "extra-cost", lazy: () => import("./config/extra-cost/page") },
              { path: "tax-profile", lazy: () => import("./config/tax-profile/page") },
              { path: "department", lazy: () => import("./config/department/page") },
              { path: "department/new", lazy: () => import("./config/department/new/page") },
              { path: "department/:id", lazy: () => import("./config/department/[id]/page") },
              { path: "location", lazy: () => import("./config/location/page") },
              { path: "location/new", lazy: () => import("./config/location/new/page") },
              { path: "location/:id", lazy: () => import("./config/location/[id]/page") },
            ],
          },
        ],
      },
      { path: "*", lazy: () => import("./not-found/page") },
    ],
  },
]);
