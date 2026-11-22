import type { Money } from "@/types/domain";

/** Convert a fixed two-decimal money string into integer subunits (no float math). */
export function toSubunits(amount: Money): number {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(amount.trim());
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  const whole = Number(match[2] ?? "0");
  const fraction = Number((match[3] ?? "0").padEnd(2, "0"));
  return sign * (whole * 100 + fraction);
}

/** Convert integer subunits back into a money string. */
export function fromSubunits(subunits: number): Money {
  const sign = subunits < 0 ? "-" : "";
  const absolute = Math.abs(Math.trunc(subunits));
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

/** Sum money strings without ever going through floating point arithmetic. */
export function sumMoney(values: Money[]): Money {
  return fromSubunits(values.reduce((total, value) => total + toSubunits(value), 0));
}

/** Multiply a money string by a small integer quantity. */
export function multiplyMoney(amount: Money, quantity: number): Money {
  return fromSubunits(toSubunits(amount) * Math.trunc(quantity));
}

/** Display money with the configured locale. */
export function formatMoney(amount: Money): string {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    numberingSystem: "latn",
  }).format(toSubunits(amount) / 100);
}
