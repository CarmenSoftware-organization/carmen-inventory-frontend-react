/**
 * Builds the gateway URL that starts a Google sign-in for the App. The browser goes straight to Google (the
 * gateway redirects it); Keycloak is not involved. `next` is a same-site path to come back to afterwards
 * (e.g. an invitation page) and is re-validated by the gateway.
 * @param backendUrl - Gateway base URL from the runtime config
 * @param locale - UI language, passed on so Google's own pages match
 * @param next - Optional same-site path to return to after signing in
 * @returns The authorize URL
 */
export function buildGoogleAuthorizeUrl(
  backendUrl: string,
  locale: string,
  next?: string,
): string {
  const query = new URLSearchParams({ app: "app", locale });
  if (next) query.set("next", next);
  return `${backendUrl.replace(/\/+$/, "")}/api/auth/google/authorize?${query.toString()}`;
}
