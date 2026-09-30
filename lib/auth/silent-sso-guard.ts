/**
 * Once-per-tab flag set before a silent-check redirect (require-auth.tsx, login-form.tsx); cleared on a
 * successful sign-in (auth-callback.route.tsx) and set again just before an explicit logout's redirect
 * (use-logout.ts), since that logout ends the only session there is.
 * flag ครั้งเดียวต่อแท็บ ตั้งก่อน redirect silent check (require-auth.tsx, login-form.tsx) เคลียร์ตอน sign-in
 * สำเร็จ (auth-callback.route.tsx) และตั้งอีกครั้งก่อน redirect ของ logout (use-logout.ts) เพราะปิด session เดียวที่มี
 */
export const SILENT_SSO_TRIED_KEY = "carmen.silentSsoTried";

/**
 * A user-initiated reload gets one fresh silent-SSO check, ignoring the once-per-tab guard (typically pressed
 * right after signing in through the other app in another tab).
 * การ reload ของ user ได้ลองเช็ค silent SSO ใหม่หนึ่งครั้ง ไม่สน guard แบบครั้งเดียวต่อแท็บ (มักกดหลัง login ผ่านอีกแอป)
 */
function isUserReload(): boolean {
  try {
    const [entry] = performance.getEntriesByType("navigation");
    return (entry as PerformanceNavigationTiming | undefined)?.type === "reload";
  } catch {
    return false;
  }
}

/** Pure read, safe during render (unlike the `setItem` that follows a decision to redirect). */
export function hasTriedSilentSso(): boolean {
  try {
    return sessionStorage.getItem(SILENT_SSO_TRIED_KEY) === "1" && !isUserReload();
  } catch {
    return false;
  }
}
