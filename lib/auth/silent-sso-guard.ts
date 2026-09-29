/**
 * Set once per tab session right before a silent-check redirect fires (require-auth.tsx,
 * routes/login/login-form.tsx), and cleared on a successful sign-in
 * (routes/login/google-callback.route.tsx) or right before an explicit logout's own redirect
 * (hooks/use-logout.ts, since that logout is itself ending the only session there is).
 * ตั้งครั้งเดียวต่อ tab session ก่อน redirect เช็คแบบเงียบจะยิง (require-auth.tsx,
 * routes/login/login-form.tsx) แล้วเคลียร์ตอน sign-in สำเร็จ (routes/login/google-callback.route.tsx)
 * หรือก่อน redirect ของ logout เอง (hooks/use-logout.ts เพราะ logout นั้นกำลังปิด session เดียวที่มีอยู่)
 */
export const SILENT_SSO_TRIED_KEY = "carmen.silentSsoTried";

/**
 * A real user-initiated reload (F5 / Ctrl+R / the browser's reload button) always gets one
 * fresh silent-SSO-check attempt, ignoring the tab-session guard below — someone hitting
 * reload on a protected route or /login is deliberately asking "check again," most commonly
 * right after establishing a session in the *other* app in a different tab. Without this, the
 * guard (correctly) never re-fires on its own for the rest of the tab's life once tried, so a
 * reload would look identical to any other in-app navigation and stay stuck skipping the
 * check forever.
 * การ reload จริงของ user (F5 / Ctrl+R / ปุ่ม reload ของ browser) จะได้ลองเช็คใหม่เสมอหนึ่งครั้ง
 * ไม่สนใจ guard ของ tab session ด้านล่าง — คนที่กด reload ที่ protected route หรือ /login ตั้งใจจะ
 * "เช็คใหม่อีกที" ส่วนใหญ่คือเพิ่ง login สำเร็จที่อีกแอปในอีกแท็บมา ถ้าไม่มีเงื่อนไขนี้ guard จะไม่ยิงซ้ำ
 * เองอีกเลยตลอด tab session นั้น (ถูกแล้วสำหรับ in-app navigation ปกติ) ทำให้ reload ดูเหมือน
 * navigation อื่นๆ แล้วค้างข้ามการเช็คไปตลอดกาล
 */
function isUserReload(): boolean {
  try {
    const [entry] = performance.getEntriesByType("navigation");
    return (entry as PerformanceNavigationTiming | undefined)?.type === "reload";
  } catch {
    return false;
  }
}

/** Pure read — safe during render, unlike the `setItem` that follows a decision to redirect. */
export function hasTriedSilentSso(): boolean {
  try {
    return sessionStorage.getItem(SILENT_SSO_TRIED_KEY) === "1" && !isUserReload();
  } catch {
    return false;
  }
}
