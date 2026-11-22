import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OrderTimeline } from "@/components/tracking/OrderTimeline";
import { statusLabel } from "@/constants/messages";
import { UI } from "@/constants/ui";
import { formatDateTime } from "@/utils/date";

import { cancelledTracking, makeTracking } from "./handlers";
import { renderWithProviders } from "./utils";

describe("order timeline", () => {
  it("renders tracking events in order with Arabic labels and dates", () => {
    const tracking = makeTracking();
    const { container } = renderWithProviders(
      <OrderTimeline events={tracking.events} currentStatus="SHIPPED" />
    );

    expect(screen.getByRole("region", { name: UI.orders.timeline })).toBeInTheDocument();

    const lists = container.querySelectorAll("ol");
    const eventList = lists[1];
    if (!eventList) throw new Error("Timeline event list was not rendered");
    const rows = Array.from(eventList.querySelectorAll("li")).map((row) => row.textContent ?? "");

    expect(rows).toHaveLength(tracking.events.length);
    tracking.events.forEach((event, index) => {
      const row = rows[index] ?? "";
      expect(row).toContain(statusLabel(event.status));
      expect(row).toContain(formatDateTime(event.at));
      if (event.note) expect(row).toContain(event.note);
    });

    // Explicitly verify chronological ordering, not just presence.
    expect(rows[0]).toContain(statusLabel("PENDING"));
    expect(rows[1]).toContain(statusLabel("CONFIRMED"));
    expect(rows[2]).toContain(statusLabel("SHIPPED"));
  });

  it("shows a danger notice for a cancelled order while keeping its events", () => {
    const { container } = renderWithProviders(
      <OrderTimeline events={cancelledTracking.events} currentStatus="CANCELLED" />
    );

    expect(screen.getByRole("status")).toHaveTextContent("تم إلغاء هذا الطلب.");
    expect(screen.getAllByText(statusLabel("CANCELLED")).length).toBeGreaterThan(0);

    const lists = container.querySelectorAll("ol");
    const eventList = lists[1];
    if (!eventList) throw new Error("Timeline event list was not rendered");
    expect(eventList.querySelectorAll("li")).toHaveLength(cancelledTracking.events.length);
  });
});
