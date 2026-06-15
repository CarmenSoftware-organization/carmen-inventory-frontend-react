/**
 * Sanitize a post-login `?next=` redirect target to a safe in-app absolute
 * path. Anything missing, non-absolute, or protocol-relative (`//`, `/\`)
 * falls back to /dashboard so an attacker can't redirect off-site.
 */
export const resolveNextPath = (next: string | null): string => {
  const fallback = "/dashboard";
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
};
