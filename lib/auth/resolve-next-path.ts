export const resolveNextPath = (next: string | null): string => {
  const fallback = "/dashboard";
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
};
