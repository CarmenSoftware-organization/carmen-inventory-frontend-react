
import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Hook ตรวจจับว่าขนาดหน้าจอปัจจุบันอยู่ในโหมด mobile หรือไม่ (breakpoint 768px)
 *
 * ใช้ `window.matchMedia` subscribe event `change` และ cleanup เมื่อ unmount
 * ค่าเริ่มต้นคือ `undefined` เพื่อหลีกเลี่ยง hydration mismatch ระหว่าง SSR/CSR
 * ผู้ใช้งานควรเช็ค `isMobile === true` ไม่ใช่ truthy เท่านั้น
 *
 * @returns true หากเป็น mobile, false หากไม่ใช่, undefined ก่อน mount
 * @example
 * ```ts
 * const isMobile = useIsMobile();
 * return isMobile ? <MobileView /> : <DesktopView />;
 * ```
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
