import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { useChangeStatus, useOrder, useTracking } from "@/hooks/useOrders";
import { DEMO_TOKEN } from "@/services/demoMode";
import {
  DEMO_COURIER_PHONE,
  getDemoAdminUser,
  getStoredDemoOrders,
} from "@/services/mockDemoData";
import { ordersService } from "@/services/orders.service";

import { seedSession } from "./utils";

function wrapperFor(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("demo order flow", () => {
  beforeEach(() => {
    seedSession(getDemoAdminUser(), DEMO_TOKEN);
  });

  it("refreshes the detail and tracking queries after a status change", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    getStoredDemoOrders();

    const { result } = renderHook(
      () => ({
        order: useOrder("order-105"),
        tracking: useTracking("order-105"),
        changeStatus: useChangeStatus(),
      }),
      { wrapper: wrapperFor(queryClient) }
    );

    await waitFor(() => expect(result.current.order.isSuccess).toBe(true));
    expect(result.current.order.data?.status).toBe("CONFIRMED");

    await act(async () => {
      await result.current.changeStatus.mutateAsync({
        id: "order-105",
        payload: { status: "PACKED" },
      });
    });

    await waitFor(() => expect(result.current.order.data?.status).toBe("PACKED"));
    await waitFor(() =>
      expect(result.current.tracking.data?.events.map((event) => event.status)).toContain("PACKED")
    );
  });

  it("stores a courier phone when the order is shipped", async () => {
    getStoredDemoOrders();
    const shipped = await ordersService.ship("order-104", {
      carrier: "PARCELPATH Express",
      tracking_number: "PP-TEST-0001",
    });

    expect(shipped.status).toBe("SHIPPED");
    expect(shipped.courier_phone).toBe(DEMO_COURIER_PHONE);

    const tracking = await ordersService.tracking("order-104");
    expect(tracking.courier_phone).toBe(DEMO_COURIER_PHONE);
  });

  it("keeps seeded delivery orders visible with a courier phone", () => {
    const orders = getStoredDemoOrders();
    const delivered = orders.find((order) => order.id === "order-101");
    const outForDelivery = orders.find((order) => order.id === "order-102");

    expect(delivered?.courier_phone).toBe(DEMO_COURIER_PHONE);
    expect(outForDelivery?.courier_phone).toBe(DEMO_COURIER_PHONE);
  });
});
