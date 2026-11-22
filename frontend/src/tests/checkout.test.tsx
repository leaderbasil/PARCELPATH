import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { getErrorMessage } from "@/constants/messages";
import { UI } from "@/constants/ui";
import Checkout from "@/pages/checkout/Checkout";
import { formatMoney } from "@/utils/money";
import { getIdempotencyKey } from "@/utils/idempotency";

import { API_BASE, cartProduct, customerUser, isRecord, makeOrder, readString } from "./handlers";
import { server } from "./server";
import { findField, LocationDisplay, renderWithProviders, seedCart, seedSession, storedCart } from "./utils";

/** Intl adds RTL marks/NBSP in Arabic currency output; compare visible text only. */
function visibleText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/\p{Cf}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function moneyMatcher(expected: string) {
  return (_content: string, element: Element | null): boolean =>
    element !== null && visibleText(element.textContent) === visibleText(expected);
}

let createCalls = 0;
let capturedKey: string | null = null;
let capturedBody: Record<string, unknown> | null = null;

beforeEach(() => {
  createCalls = 0;
  capturedKey = null;
  capturedBody = null;
});

function renderCheckout() {
  return renderWithProviders(
    <>
      <LocationDisplay />
      <Checkout />
    </>,
    { route: "/checkout" }
  );
}

async function fillShippingForm(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.clear(findField(UI.checkout.fullName));
  await user.type(findField(UI.checkout.fullName), "عميل تجريبي");
  await user.clear(findField(UI.checkout.phone));
  await user.type(findField(UI.checkout.phone), "0100000000");
  await user.type(findField(UI.checkout.city), "Cairo");
  await user.type(findField(UI.checkout.address), "123 Main Street, Cairo");
  await user.click(screen.getByRole("button", { name: UI.checkout.placeOrder }));
}

function useSuccessHandler(): void {
  server.use(
    http.post(`${API_BASE}/orders`, async ({ request }) => {
      createCalls += 1;
      capturedKey = request.headers.get("Idempotency-Key");
      const body: unknown = await request.json();
      capturedBody = isRecord(body) ? body : {};
      return HttpResponse.json(
        {
          data: makeOrder({
            id: "order-success-1",
            total_amount: "51.00",
            subtotal: "51.00",
            shipping_fee: "0.00",
          }),
          message: "Order created",
        },
        { status: 201 }
      );
    })
  );
}

describe("checkout", () => {
  it("shows the empty-cart state for an empty cart", () => {
    seedSession(customerUser, "test-token-customer");
    renderCheckout();

    expect(screen.getByText(UI.cart.empty)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: UI.checkout.placeOrder })).toBeNull();
  });

  it("sends the idempotency key and fixed 2-decimal amounts, then clears cart and used key", async () => {
    const user = userEvent.setup();
    seedSession(customerUser, "test-token-customer");
    seedCart([{ ...cartProduct, quantity: 2 }]);
    const originalKey = getIdempotencyKey();
    useSuccessHandler();
    renderCheckout();

    expect(screen.getAllByText(moneyMatcher(formatMoney("51.00"))).length).toBeGreaterThan(0);
    await fillShippingForm(user);

    await waitFor(() => expect(createCalls).toBe(1));
    expect(capturedKey).toBe(originalKey);
    expect(capturedKey?.length ?? 0).toBeGreaterThanOrEqual(8);

    if (!capturedBody) throw new Error("Order request body was not captured");
    const items: unknown = capturedBody["items"];
    expect(Array.isArray(items)).toBe(true);
    if (!Array.isArray(items)) throw new Error("Order items were not sent");
    const firstItem: unknown = items[0];
    if (!isRecord(firstItem)) throw new Error("First order item is malformed");
    expect(readString(firstItem, "product_id")).toBe(cartProduct.product_id);
    expect(firstItem["quantity"]).toBe(2);
    expect(readString(capturedBody, "payment_method")).toBe("COD");

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/orders/order-success-1");
    });
    expect(storedCart()).toHaveLength(0);
    // The used key is consumed; a fresh key may be prepared for the next cart.
    expect(sessionStorage.getItem("checkout:idempotency-key")).not.toBe(originalKey);
  });

  it("keeps cart and key, and shows the Arabic INSUFFICIENT_STOCK error", async () => {
    const user = userEvent.setup();
    seedSession(customerUser, "test-token-customer");
    seedCart([{ ...cartProduct, quantity: 2 }]);
    const originalKey = getIdempotencyKey();

    server.use(
      http.post(`${API_BASE}/orders`, ({ request }) => {
        createCalls += 1;
        capturedKey = request.headers.get("Idempotency-Key");
        return HttpResponse.json(
          {
            detail: getErrorMessage("INSUFFICIENT_STOCK"),
            code: "INSUFFICIENT_STOCK",
            meta: { available: 3 },
          },
          { status: 409 }
        );
      })
    );
    renderCheckout();

    await fillShippingForm(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      getErrorMessage("INSUFFICIENT_STOCK")
    );
    expect(createCalls).toBe(1);
    expect(capturedKey).toBe(originalKey);
    expect(sessionStorage.getItem("checkout:idempotency-key")).toBe(originalKey);
    expect(storedCart()).toHaveLength(1);
    expect(screen.getByTestId("location")).toHaveTextContent("/checkout");
  });
});
