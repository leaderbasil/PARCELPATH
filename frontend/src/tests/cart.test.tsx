import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { UI } from "@/constants/ui";
import { useCart } from "@/context/CartContext";
import Cart from "@/pages/cart/Cart";
import { formatMoney, fromSubunits, toSubunits } from "@/utils/money";

import { cartProduct } from "./handlers";
import { renderWithProviders, seedCart, storedCart } from "./utils";

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

/** Exposes the raw cart math so integer-subunit guarantees can be asserted. */
function CartProbe() {
  const cart = useCart();
  return (
    <div>
      <output data-testid="count">{cart.itemCount}</output>
      <output data-testid="total">{cart.getTotal()}</output>
      <output data-testid="formatted">{formatMoney(cart.getTotal())}</output>
      <output data-testid="quantity">{cart.items[0]?.quantity ?? 0}</output>
      <button type="button" onClick={() => cart.addItem(cartProduct)}>
        add
      </button>
      <button type="button" onClick={() => cart.addItem({ ...cartProduct, quantity: 0 })}>
        add-zero
      </button>
      <button
        type="button"
        onClick={() => cart.updateQuantity(cartProduct.product_id, 150)}
      >
        set-150
      </button>
      <button
        type="button"
        onClick={() => cart.updateQuantity(cartProduct.product_id, -5)}
      >
        set-negative
      </button>
      <button type="button" onClick={() => cart.removeItem(cartProduct.product_id)}>
        remove
      </button>
    </div>
  );
}

describe("cart", () => {
  it("adds items using integer subunits and formats the subtotal", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CartProbe />);

    await user.click(screen.getByRole("button", { name: "add" }));
    await user.click(screen.getByRole("button", { name: "add" }));

    // 25.50 * 2 == 5100 subunits == "51.00" — no floating point drift.
    const expectedSubtotal = fromSubunits(toSubunits(cartProduct.price) * 2);
    expect(expectedSubtotal).toBe("51.00");
    expect(screen.getByTestId("count")).toHaveTextContent("2");
    expect(screen.getByTestId("total")).toHaveTextContent(expectedSubtotal);
    expect(screen.getByTestId("formatted")).toHaveTextContent("51.00");
  });

  it("clamps every quantity change to 1..99", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CartProbe />);

    await user.click(screen.getByRole("button", { name: "add-zero" }));
    expect(screen.getByTestId("quantity")).toHaveTextContent("1");

    await user.click(screen.getByRole("button", { name: "set-150" }));
    expect(screen.getByTestId("quantity")).toHaveTextContent("99");

    await user.click(screen.getByRole("button", { name: "set-negative" }));
    expect(screen.getByTestId("quantity")).toHaveTextContent("1");
  });

  it("removes an item and resets the total", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CartProbe />);

    await user.click(screen.getByRole("button", { name: "add" }));
    expect(screen.getByTestId("count")).toHaveTextContent("1");

    await user.click(screen.getByRole("button", { name: "remove" }));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(screen.getByTestId("total")).toHaveTextContent("0.00");
  });

  it("renders a seeded cart with a fixed two-decimal total and supports removal", async () => {
    const user = userEvent.setup();
    seedCart([{ ...cartProduct, quantity: 2 }]);
    renderWithProviders(<Cart />, { route: "/cart" });

    expect(screen.getAllByText(moneyMatcher(formatMoney("51.00"))).length).toBeGreaterThan(0);
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    expect(screen.getByText("Wireless Mouse")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: UI.cart.remove }));
    expect(await screen.findByText(UI.cart.empty)).toBeInTheDocument();
    expect(storedCart()).toHaveLength(0);
  });
});
