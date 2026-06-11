import { render, screen, waitFor } from "@testing-library/react";
import { useTranslations } from "use-intl";
import { beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "@/components/i18n-provider";

function Probe() {
  const t = useTranslations("common");
  return <span data-testid="msg">{t("save")}</span>;
}

describe("I18nProvider", () => {
  beforeEach(() => localStorage.clear());

  it("loads default-locale messages and renders translations", async () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("msg")).toHaveTextContent("Save"),
    );
    expect(document.documentElement.lang).toBe("en");
  });
});
