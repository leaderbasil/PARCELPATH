import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { CartItemRow } from "@/components/cart/CartItemRow";
import { CartSummary } from "@/components/cart/CartSummary";
import { EmptyState } from "@/components/common/EmptyState";
import { UI } from "@/constants/ui";
import { useCart } from "@/context/CartContext";
import { ApiRequestError } from "@/services/api";
import { productsService } from "@/services/products.service";

export default function Cart() {
  const cart = useCart();
  const { items: cartItems, removeItem, syncItem } = cart;
  const navigate = useNavigate();
  const [notices, setNotices] = useState<string[]>([]);
  const lastSynced = useRef<string>("");

  const signature = JSON.stringify(
    cartItems.map((item) => ({
      id: item.product_id,
      price: item.price,
      name: item.name,
      image: item.image_url,
      stock: item.stock_quantity,
      quantity: item.quantity,
    }))
  );

  // Revalidate every cart line against the server before checkout.
  useEffect(() => {
    if (cartItems.length === 0) {
      lastSynced.current = "";
      setNotices([]);
      return;
    }
    if (lastSynced.current === signature) return;

    let cancelled = false;
    const messages: string[] = [];
    const currentItems = [...cartItems];

    const revalidate = async (): Promise<void> => {
      for (const item of currentItems) {
        try {
          const fresh = await productsService.get(item.product_id);
          if (cancelled) return;
          if (!fresh.in_stock) {
            removeItem(item.product_id);
            messages.push(UI.cart.itemRemoved);
            continue;
          }
          const stock =
            "stock_quantity" in fresh && typeof fresh.stock_quantity === "number"
              ? fresh.stock_quantity
              : Math.max(item.quantity, 1);
          const changed =
            fresh.price !== item.price ||
            fresh.name !== item.name ||
            fresh.image_url !== item.image_url ||
            stock !== item.stock_quantity;
          if (changed) {
            syncItem({
              ...item,
              name: fresh.name,
              price: fresh.price,
              image_url: fresh.image_url,
              stock_quantity: stock,
            });
            messages.push(UI.cart.priceUpdated);
          }
        } catch (error: unknown) {
          if (cancelled) return;
          if (error instanceof ApiRequestError && error.code === "PRODUCT_NOT_FOUND") {
            removeItem(item.product_id);
            messages.push(UI.cart.itemRemoved);
          }
          // Transient/network errors keep the line so the customer can retry checkout.
        }
      }
      if (!cancelled) {
        lastSynced.current = signature;
        setNotices(messages);
      }
    };

    void revalidate();
    return () => {
      cancelled = true;
    };
  }, [signature, cartItems, removeItem, syncItem]);

  if (cart.items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-none p-4 py-10">
        <h1 className="mb-6 text-2xl font-bold text-text">{UI.cart.title}</h1>
        <EmptyState message={UI.cart.empty} />
        <div className="mt-6 text-center">
          <Link to="/" className="text-sm font-medium text-primary-strong underline">
            {UI.cart.continueShopping}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-none p-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-text">{UI.cart.title}</h1>
      {notices.length > 0 ? (
        <div role="status" className="mb-4 space-y-1 rounded-lg bg-warning-soft p-3 text-sm text-warning-strong">
          {notices.map((message, index) => (
            <p key={`${message}-${index}`}>{message}</p>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="space-y-3" aria-label={UI.cart.title}>
          {cart.items.map((item) => (
            <CartItemRow key={item.product_id} item={item} />
          ))}
        </section>
        <div className="space-y-4">
          <CartSummary subtotal={cart.getTotal()} onCheckout={() => navigate("/checkout")} />
          <p className="text-center text-sm text-text-muted">
            {UI.orders.items}: {cart.itemCount}
          </p>
          <Link to="/" className="block text-center text-sm text-primary-strong underline">
            {UI.cart.continueShopping}
          </Link>
        </div>
      </div>
    </main>
  );
}
