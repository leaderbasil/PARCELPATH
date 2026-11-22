import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { ShipModal } from "@/components/orders/ShipModal";
import { getErrorMessage } from "@/constants/messages";
import { UI } from "@/constants/ui";

import { API_BASE, isRecord, readString } from "./handlers";
import { server } from "./server";
import { findField, renderWithProviders } from "./utils";

const orderId = "11111111-1111-4111-8111-111111111111";

let shipCalls = 0;
let capturedBody: Record<string, unknown> | null = null;
let closeCalls = 0;

beforeEach(() => {
  shipCalls = 0;
  capturedBody = null;
  closeCalls = 0;
});

function renderShipModal() {
  return renderWithProviders(
    <ShipModal open orderId={orderId} onClose={() => { closeCalls += 1; }} />
  );
}

function useShipHandler(status: "success" | "duplicate"): void {
  server.use(
    http.post(`${API_BASE}/orders/:id/ship`, async ({ request }) => {
      shipCalls += 1;
      const body: unknown = await request.json();
      capturedBody = isRecord(body) ? body : {};
      if (status === "duplicate") {
        return HttpResponse.json(
          {
            detail: getErrorMessage("DUPLICATE_TRACKING_NUMBER"),
            code: "DUPLICATE_TRACKING_NUMBER",
          },
          { status: 409 }
        );
      }
      return HttpResponse.json(
        { data: { id: orderId, status: "SHIPPED" }, message: "Order shipped" },
        { status: 200 }
      );
    })
  );
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  trackingNumber: string
): Promise<void> {
  await user.type(findField(UI.orders.carrier), "Aramex");
  await user.type(findField(UI.orders.trackingNumber), trackingNumber);
  await user.click(screen.getByRole("button", { name: UI.admin.shipOrder }));
}

describe("ship modal", () => {
  it("blocks an empty carrier or tracking number before any request", async () => {
    const user = userEvent.setup();
    useShipHandler("success");
    renderShipModal();

    await user.click(screen.getByRole("button", { name: UI.admin.shipOrder }));

    expect(await screen.findByText("اسم الناقل قصير جدًا")).toBeInTheDocument();
    expect(screen.getByText("رقم التتبّع قصير جدًا")).toBeInTheDocument();
    expect(shipCalls).toBe(0);
    expect(closeCalls).toBe(0);
  });

  it("posts carrier and tracking_number and closes on success", async () => {
    const user = userEvent.setup();
    useShipHandler("success");
    renderShipModal();

    await fillAndSubmit(user, "TRACK-123");

    await waitFor(() => expect(shipCalls).toBe(1));
    if (!capturedBody) throw new Error("Ship request body was not captured");
    expect(readString(capturedBody, "carrier")).toBe("Aramex");
    expect(readString(capturedBody, "tracking_number")).toBe("TRACK-123");
    await waitFor(() => expect(closeCalls).toBe(1));
  });

  it("keeps the modal open and shows the Arabic duplicate-tracking error", async () => {
    const user = userEvent.setup();
    useShipHandler("duplicate");
    renderShipModal();

    await fillAndSubmit(user, "DUP-123");

    expect(await screen.findByText(getErrorMessage("DUPLICATE_TRACKING_NUMBER"))).toBeInTheDocument();
    expect(shipCalls).toBe(1);
    expect(closeCalls).toBe(0);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
