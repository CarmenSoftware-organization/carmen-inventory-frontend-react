import { useEffect } from "react";
import { useLocation, useParams } from "react-router";
import { useBuCode } from "@/hooks/use-bu-code";
import {
  setAnalyticsBuCode,
  startAnalytics,
  stopAnalytics,
  toRoutePattern,
  trackPageView,
} from "@/lib/analytics";

/**
 * สะพานเชื่อม React → lib/analytics (module นอก React อ่าน router/query cache เองไม่ได้)
 * — mount ใน RootLayout (ProtectedShell) เท่านั้น จึงเริ่มเก็บหลัง login เสมอ
 */
export function AnalyticsBridge() {
  const buCode = useBuCode();
  const location = useLocation();
  const params = useParams();

  useEffect(() => {
    startAnalytics();
    return () => stopAnalytics();
  }, []);

  useEffect(() => {
    setAnalyticsBuCode(buCode);
  }, [buCode]);

  useEffect(() => {
    trackPageView(location.pathname, toRoutePattern(location.pathname, params));
    // ตั้งใจผูกกับ pathname เท่านั้น — params เปลี่ยนตาม pathname อยู่แล้ว
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return null;
}
