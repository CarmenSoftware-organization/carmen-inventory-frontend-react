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
          {
            path: "procurement",
            ErrorBoundary: RouteErrorBoundaryAdapter,
            children: [
              { index: true, lazy: () => import("./procurement/page") },
              { path: "purchase-request-template", lazy: () => import("./procurement/purchase-request-template/page") },
              { path: "purchase-request-template/new", lazy: () => import("./procurement/purchase-request-template/new/page") },
              { path: "purchase-request-template/:id", lazy: () => import("./procurement/purchase-request-template/[id]/page") },
              { path: "credit-note", lazy: () => import("./procurement/credit-note/page") },
              { path: "credit-note/new", lazy: () => import("./procurement/credit-note/new/page") },
              { path: "credit-note/:id", lazy: () => import("./procurement/credit-note/[id]/page") },
              { path: "goods-receive-note", lazy: () => import("./procurement/goods-receive-note/page") },
              { path: "goods-receive-note/new", lazy: () => import("./procurement/goods-receive-note/new/page") },
              { path: "goods-receive-note/:id", lazy: () => import("./procurement/goods-receive-note/[id]/page") },
              { path: "purchase-order", lazy: () => import("./procurement/purchase-order/page") },
              { path: "purchase-order/new", lazy: () => import("./procurement/purchase-order/new/page") },
              { path: "purchase-order/from-price-list", lazy: () => import("./procurement/purchase-order/from-price-list/page") },
              { path: "purchase-order/:id", lazy: () => import("./procurement/purchase-order/[id]/page") },
              { path: "purchase-request", lazy: () => import("./procurement/purchase-request/page") },
              { path: "purchase-request/new", lazy: () => import("./procurement/purchase-request/new/page") },
              { path: "purchase-request/:id", lazy: () => import("./procurement/purchase-request/[id]/page") },
              { path: "approval", lazy: () => import("./procurement/approval/page") },
            ],
          },
          {
            path: "inventory-management",
            ErrorBoundary: RouteErrorBoundaryAdapter,
            children: [
              { index: true, lazy: () => import("./inventory-management/page") },
              { path: "inventory-adjustment", lazy: () => import("./inventory-management/inventory-adjustment/page") },
              { path: "inventory-adjustment/new", lazy: () => import("./inventory-management/inventory-adjustment/new/page") },
              { path: "inventory-adjustment/:id", lazy: () => import("./inventory-management/inventory-adjustment/[id]/page") },
              { path: "transaction", lazy: () => import("./inventory-management/transaction/page") },
              { path: "physical-count", lazy: () => import("./inventory-management/physical-count/page") },
              { path: "physical-count/new", lazy: () => import("./inventory-management/physical-count/new/page") },
              { path: "physical-count/:id", lazy: () => import("./inventory-management/physical-count/[id]/page") },
              { path: "physical-count/:id/entry", lazy: () => import("./inventory-management/physical-count/[id]/entry/page") },
              { path: "physical-count/:id/review", lazy: () => import("./inventory-management/physical-count/[id]/review/page") },
              { path: "spot-check", lazy: () => import("./inventory-management/spot-check/page") },
              { path: "spot-check/location/:location_id", lazy: () => import("./inventory-management/spot-check/location/[location_id]/page") },
              { path: "spot-check/:id", lazy: () => import("./inventory-management/spot-check/[id]/page") },
              { path: "spot-check/:id/review", lazy: () => import("./inventory-management/spot-check/[id]/review/page") },
              { path: "period-end", lazy: () => import("./inventory-management/period-end/page") },
              { path: "period-end/review", lazy: () => import("./inventory-management/period-end/review/page") },
            ],
          },
        ],
      },
      { path: "*", lazy: () => import("./not-found/page") },
    ],
  },
]);
