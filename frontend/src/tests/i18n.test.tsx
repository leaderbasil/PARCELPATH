import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { LanguageToggle } from "@/components/common/LanguageToggle";
import { LOCALE_STORAGE_KEY } from "@/i18n";
import ar from "@/locales/ar.json";
import en from "@/locales/en.json";

import { renderWithProviders } from "./utils";

describe("language switching", () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta name="description" content="" />';
  });

  it("starts in Arabic RTL and switches the app to English LTR", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageToggle />);

    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.title).toBe(ar.ui.metaTitle);
    const toggle = screen.getByRole("button", { name: ar.ui.common.switchToEnglish });
    expect(toggle).toHaveTextContent("EN");

    await user.click(toggle);

    expect(
      await screen.findByRole("button", { name: en.ui.common.switchToArabic })
    ).toHaveTextContent("ع");
    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
    expect(document.title).toBe(en.ui.metaTitle);
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
  });

  it("restores a saved English locale before render", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "en");

    renderWithProviders(<LanguageToggle />);

    expect(screen.getByRole("button", { name: en.ui.common.switchToArabic })).toBeTruthy();
    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
    expect(document.title).toBe(en.ui.metaTitle);
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      "content",
      en.ui.metaDescription
    );
  });
});
