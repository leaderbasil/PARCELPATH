import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "@/components/common/StatusBadge";
import { StatusActions } from "@/components/orders/StatusActions";
import { statusLabel } from "@/constants/messages";
import { UI } from "@/constants/ui";
import OrderDetails from "@/pages/my-orders/OrderDetails";
import { ALLOWED_TRANSITIONS, type OrderStatus } from "@/types/domain";

import { API_BASE, customerUser, makeOrder } from "./handlers";
import { server } from "./server";
import { LocationDisplay, renderWithProviders, seedSession } from "./utils";

const orderId = "11111111-1111-4111-8111-111111111111";

describe("orders", () => {
  it("asks for confirmation before calling the cancel endpoint", async () => {
    const user = userEvent.setup();
    let cancelCalls = 0;
    seedSession(customerUser, "test-token-customer");

    server.use(
      http.post(`${API_BASE}/orders/:id/cancel`, () => {
        cancelCalls += 1;
        return HttpResponse.json({
          data: makeOrder({ status: "CANCELLED" }),
          message: "Order cancelled",
        });
      })
    );

    renderWithProviders(
      <>
        <LocationDisplay />
        <Routes>
          <Route path="/orders/:id" element={<OrderDetails />} />
        </Routes>
      </>,
      { route: `/orders/${orderId}` }
    );

    await user.click(await screen.findByRole("button", { name: UI.orders.cancel }));

    expect(await screen.findByText(UI.orders.cancelConfirm)).toBeInTheDocument();
    expect(cancelCalls).toBe(0);

    await user.click(screen.getByRole("button", { name: UI.common.confirm }));
    await waitFor(() => expect(cancelCalls).toBe(1));
  });

  it("renders Arabic labels for every order status badge", () => {
    const statuses: OrderStatus[] = [
      "PENDING",
      "CONFIRMED",
      "PACKED",
      "SHIPPED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
    ];

    renderWithProviders(
      <div>
        {statuses.map((status) => (
          <StatusBadge key={status} status={status} />
        ))}
      </div>
    );

    for (const status of statuses) {
      expect(screen.getByText(statusLabel(status))).toBeInTheDocument();
    }
  });

  it("does not offer admin transitions for a terminal order", () => {
    const { container } = renderWithProviders(
      <StatusActions order={makeOrder({ status: "DELIVERED" })} isAdmin />
    );

    expect(container.firstChild).toBeNull();
    expect(ALLOWED_TRANSITIONS["DELIVERED"]).toHaveLength(0);
    expect(ALLOWED_TRANSITIONS["CANCELLED"]).toHaveLength(0);
    // A shipped order may not jump back to PACKED.
    expect(ALLOWED_TRANSITIONS["SHIPPED"]).not.toContain("PACKED");
  });

  it("offers only allowed admin actions for a pending order", () => {
    renderWithProviders(<StatusActions order={makeOrder({ status: "PENDING" })} isAdmin />);

    expect(
      screen.getByRole("button", { name: UI.admin.confirmOrder })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: UI.orders.cancel })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: UI.admin.shipOrder })).toBeNull();
    expect(ALLOWED_TRANSITIONS["PENDING"]).toContain("CONFIRMED");
  });
});
