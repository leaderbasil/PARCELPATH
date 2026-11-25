import { describe, expect, it } from "vitest";

import { whatsappUrl } from "@/utils/whatsapp";

describe("WhatsApp courier links", () => {
  it("converts a Saudi local number", () => {
    expect(whatsappUrl("0501234567")).toBe("https://wa.me/966501234567");
  });

  it("keeps an international number unchanged", () => {
    expect(whatsappUrl("+966 50 123 4567")).toBe("https://wa.me/966501234567");
  });

  it("handles a 00-prefixed number", () => {
    expect(whatsappUrl("00966501234567")).toBe("https://wa.me/966501234567");
  });

  it("returns null when the number is missing", () => {
    expect(whatsappUrl(null)).toBeNull();
    expect(whatsappUrl("   ")).toBeNull();
  });
});
