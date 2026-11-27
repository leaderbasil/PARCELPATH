import { EmptyState } from "@/components/common/EmptyState";
import { statusLabel } from "@/constants/messages";
import { useUI } from "@/i18n";
import type { OrderStatus, TrackingEvent } from "@/types/domain";
import { ORDER_STEPS } from "@/types/domain";
import { cn } from "@/utils/cn";
import { TrackingEventItem } from "./TrackingEventItem";

interface OrderTimelineProps {
  events: TrackingEvent[];
  currentStatus: OrderStatus;
}

export function OrderTimeline({ events, currentStatus }: OrderTimelineProps) {
  const ui = useUI();
  const currentIndex = ORDER_STEPS.indexOf(currentStatus);
  const isCancelled = currentStatus === "CANCELLED";

  return (
    <section
      className="rounded-card border border-border bg-surface p-5 shadow-card"
      aria-label={ui.orders.timeline}
    >
      <h2 className="mb-4 text-lg font-semibold text-text">{ui.orders.timeline}</h2>

      <ol className="mb-6 flex flex-wrap items-center gap-2">
        {ORDER_STEPS.map((step, index) => {
          const reached = currentIndex >= 0 && index <= currentIndex;
          const active = index === currentIndex;
          return (
            <li
              key={step}
              aria-current={active ? "step" : undefined}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium",
                active
                  ? "bg-primary text-surface"
                  : reached
                    ? "bg-primary-soft text-primary-strong"
                    : "bg-background text-text-muted"
              )}
            >
              {statusLabel(step)}
            </li>
          );
        })}
      </ol>

      {isCancelled ? (
        <p role="status" className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-strong">
          {ui.orders.cancelledNotice}
        </p>
      ) : null}

      {events.length === 0 ? (
        <EmptyState message={ui.orders.noEvents} />
      ) : (
        <ol className="flex flex-col">
          {events.map((event, index) => (
            <TrackingEventItem
              key={`${event.status}-${event.at}-${index}`}
              event={event}
              isLast={index === events.length - 1}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
