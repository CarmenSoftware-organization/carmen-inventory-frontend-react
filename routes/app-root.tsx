import { Outlet } from "react-router";
import { Toaster } from "sonner";
import { I18nProvider } from "@/components/i18n-provider";
import Providers from "@/components/providers";
import { TopLoader } from "@/components/top-loader";

/** Root ของ React tree — แทน app/layout.tsx เดิม (fonts/styles โหลดใน main.tsx) */
export default function AppRoot() {
  return (
    <I18nProvider>
      <Providers>
        {/* Skip link (WCAG 2.4.1) — คงพฤติกรรมเดิม */}
        <a
          href="#main-content"
          className="focus:bg-background focus:text-foreground sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2"
        >
          Skip to content
        </a>
        <TopLoader />
        <Outlet />
        <Toaster
          richColors
          closeButton
          position="bottom-left"
          mobileOffset={{ top: "1rem", left: "1rem", right: "1rem" }}
          offset={{ top: "1rem", right: "1rem" }}
        />
      </Providers>
    </I18nProvider>
  );
}
