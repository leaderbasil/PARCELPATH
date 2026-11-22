import { DateText } from "@/components/common/DateText";
import { statusLabel } from "@/constants/messages";
import type { TrackingEvent } from "@/types/domain";
import { cn } from "@/utils/cn";

interface TrackingEventItemProps {
  event: TrackingEvent;
  isLast: boolean;
}

export function TrackingEventItem({ event, isLast }: TrackingEventItemProps) {
  const cancelled = event.status === "CANCELLED";

  return (
    <li className="relative flex gap-3">
      <div className="flex w-4 shrink-0 flex-col items-center" aria-hidden="true">
        <span
          className={cn(
            "mt-1.5 h-3 w-3 shrink-0 rounded-full ring-4 ring-surface",
            cancelled ? "bg-danger" : "bg-primary"
          )}
        />
        {!isLast ? <span className="mt-1 w-px flex-1 bg-border" /> : null}
      </div>

      <div className={cn("flex-1", isLast ? "pb-0" : "pb-6")}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className={cn("text-sm font-semibold", cancelled ? "text-danger-strong" : "text-text")}>
            {statusLabel(event.status)}
          </span>
          <span className="text-xs text-text-muted">
            <DateText value={event.at} />
          </span>
        </div>
        {event.note ? <p className="mt-1 text-xs text-text-muted">{event.note}</p> : null}
      </div>
    </li>
  );
}
