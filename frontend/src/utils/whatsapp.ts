import { config } from "@/config";

/** Build a wa.me link from a local or international courier phone number. */
export function whatsappUrl(phone: string | null | undefined): string | null {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (!digits) return null;

  let normalized = digits;
  if (normalized.startsWith("00")) {
    normalized = normalized.slice(2);
  } else if (normalized.startsWith("0")) {
    normalized = `${config.whatsappCountryCode}${normalized.slice(1)}`;
  }

  return `https://wa.me/${normalized}`;
}
