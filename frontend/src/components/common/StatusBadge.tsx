import { statusBadgeClass, statusLabel } from "@/constants/messages";
import type { OrderStatus } from "@/types/domain";
import { cn } from "@/utils/cn";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusBadgeClass(status))}>
      {statusLabel(status)}
    </span>
  );
}
