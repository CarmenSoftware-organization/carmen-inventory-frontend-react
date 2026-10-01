import { useLocale, useTranslations } from "use-intl";
import { buildGoogleAuthorizeUrl } from "@/lib/auth/google-authorize-url";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { Button } from "@/components/ui/button";

function GoogleLogo() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.39-2.28v-3.1H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.38l4.01-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.96 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77z"
      />
    </svg>
  );
}

/**
 * "Continue with Google" button with its "or" divider. Shared by the login page and the invitation page.
 * @param props - `next`: same-site path to return to after signing in
 * @returns The divider and the button
 */
export function GoogleSignInButton({ next }: { readonly next?: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();

  const start = () => {
    window.location.assign(
      buildGoogleAuthorizeUrl(getRuntimeConfig().BACKEND_URL, locale, next),
    );
  };

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="relative" aria-hidden>
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background text-muted-foreground px-2">
            {t("google.or")}
          </span>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-10 w-full gap-2"
        onClick={start}
      >
        <GoogleLogo />
        {t("google.continue")}
      </Button>
    </div>
  );
}
