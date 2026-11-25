import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { UI } from "@/constants/ui";
import { DEMO_TOKEN } from "@/services/demoMode";
import { getDemoCustomerUser, getStoredDemoProducts } from "@/services/mockDemoData";
import Checkout from "@/pages/checkout/Checkout";

import { API_BASE, cartProduct, customerUser, isRecord, makeOrder, readString } from "./handlers";
import { server } from "./server";
import { findField, LocationDisplay, renderWithProviders, seedCart, seedSession } from "./utils";

let capturedShipping: Record<string, unknown> | null = null;
let createCalls = 0;

beforeEach(() => {
  capturedShipping = null;
  createCalls = 0;
});

async function fillCommonFields(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.clear(findField(UI.checkout.fullName));
  await user.type(findField(UI.checkout.fullName), "عميل تجريبي");
  await user.clear(findField(UI.checkout.phone));
  await user.type(findField(UI.checkout.phone), "0100000000");
  await user.type(findField(UI.checkout.city), "Cairo");
  await user.type(findField(UI.checkout.address), "123 Main Street, Cairo");
}

function renderCheckout() {
  return renderWithProviders(
    <>
      <LocationDisplay />
      <Checkout />
    </>,
    { route: "/checkout" }
  );
}

describe("checkout location and backend payload", () => {
  it("does not add demo-only map fields to the real API payload", async () => {
    const user = userEvent.setup();
    seedSession(customerUser, "test-token-customer");
    seedCart([{ ...cartProduct, quantity: 1 }]);
    server.use(
      http.post(`${API_BASE}/orders`, async ({ request }) => {
        createCalls += 1;
        const body: unknown = await request.json();
        if (isRecord(body) && isRecord(body["shipping"])) {
          capturedShipping = body["shipping"];
        }
        return HttpResponse.json(
          { data: makeOrder({ id: "order-real-1" }), message: "Order created" },
          { status: 201 }
        );
      })
    );

    renderCheckout();
    expect(screen.queryByText(UI.checkout.mapLocation)).toBeNull();

    await fillCommonFields(user);
    await user.click(screen.getByRole("button", { name: UI.checkout.placeOrder }));

    await waitFor(() => expect(createCalls).toBe(1));
    if (!capturedShipping) throw new Error("Shipping payload was not captured");
    expect(Object.keys(capturedShipping).sort()).toEqual(["address", "city", "name", "phone"]);
    expect(readString(capturedShipping, "address")).toBe("123 Main Street, Cairo");
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/orders/order-real-1")
    );
  });

  it("requires a Google Maps location and stores it only in demo mode", async () => {
    const user = userEvent.setup();
    seedSession(getDemoCustomerUser(), DEMO_TOKEN);
    const demoProduct = getStoredDemoProducts()[0];
    if (!demoProduct) throw new Error("Demo products were not seeded");
    seedCart([
      {
        product_id: demoProduct.id,
        name: demoProduct.name,
        sku: demoProduct.sku,
        price: demoProduct.price,
        image_url: demoProduct.image_url,
        quantity: 1,
        stock_quantity: demoProduct.stock_quantity,
      },
    ]);

    renderCheckout();
    await fillCommonFields(user);
    await user.click(screen.getByRole("button", { name: UI.checkout.placeOrder }));

    expect(await screen.findByText(UI.checkout.mapRequired)).toBeInTheDocument();

    await user.type(findField(UI.checkout.mapLocation), "الرياض، حي الملقا");
    await waitFor(() =>
      expect(document.querySelector('iframe[title="الموقع على خريطة جوجل"]')).toBeTruthy()
    );

    await user.click(screen.getByRole("button", { name: UI.checkout.placeOrder }));

    await waitFor(() =>
      expect(screen.getByTestId("location").textContent).toMatch(/^\/orders\//)
    );

    const orders: unknown = JSON.parse(localStorage.getItem("parcelpath.demo.v4.orders") ?? "[]");
    expect(Array.isArray(orders)).toBe(true);
    if (!Array.isArray(orders)) throw new Error("Stored demo orders are malformed");
    const newest: unknown = orders[0];
    if (!isRecord(newest) || !isRecord(newest["shipping"])) {
      throw new Error("Stored demo order shipping is malformed");
    }
    expect(readString(newest["shipping"], "map_query")).toBe("الرياض، حي الملقا");
    expect(readString(newest["shipping"], "map_url")).toContain("google.com/maps");
  });
});
