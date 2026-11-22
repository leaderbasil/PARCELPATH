import type { Money } from "@/types/domain";
import { formatMoney } from "@/utils/money";

export function MoneyText({ value, className }: { value: Money; className?: string }) {
  return <span className={className}>{formatMoney(value)}</span>;
}
