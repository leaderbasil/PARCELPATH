import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartItem } from "@/types/domain";
import { multiplyMoney, sumMoney } from "@/utils/money";
import { refreshIdempotencyKey } from "@/utils/idempotency";

const STORAGE_KEY = "cart";

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  syncItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  getTotal: () => string;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

function parseCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is CartItem => {
      if (typeof entry !== "object" || entry === null) return false;
      const candidate = entry as Partial<CartItem>;
      return (
        typeof candidate.product_id === "string" &&
        typeof candidate.name === "string" &&
        typeof candidate.price === "string" &&
        typeof candidate.quantity === "number"
      );
    });
  } catch {
    return [];
  }
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(99, Math.max(1, Math.trunc(value)));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => parseCart(localStorage.getItem(STORAGE_KEY)));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setItems(parseCart(event.newValue));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      refreshIdempotencyKey();
      setItems((previous) => {
        const existing = previous.find((entry) => entry.product_id === item.product_id);
        if (existing) {
          return previous.map((entry) =>
            entry.product_id === item.product_id
              ? { ...entry, quantity: clamp(entry.quantity + (item.quantity ?? 1)) }
              : entry
          );
        }
        return [...previous, { ...item, quantity: clamp(item.quantity ?? 1) }];
      });
    },
    []
  );

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    refreshIdempotencyKey();
    setItems((previous) =>
      previous.map((entry) =>
        entry.product_id === productId ? { ...entry, quantity: clamp(quantity) } : entry
      )
    );
  }, []);

  const syncItem = useCallback((item: CartItem) => {
    // Server-driven refresh: price/stock are display data, so the checkout key stays valid.
    setItems((previous) =>
      previous.map((entry) =>
        entry.product_id === item.product_id ? { ...item, quantity: clamp(item.quantity) } : entry
      )
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    refreshIdempotencyKey();
    setItems((previous) => previous.filter((entry) => entry.product_id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    refreshIdempotencyKey();
    setItems([]);
  }, []);

  const getTotal = useCallback(
    () => sumMoney(items.map((item) => multiplyMoney(item.price, item.quantity))),
    [items]
  );

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  const value = useMemo<CartContextValue>(
    () => ({ items, addItem, updateQuantity, syncItem, removeItem, clearCart, getTotal, itemCount }),
    [items, addItem, updateQuantity, syncItem, removeItem, clearCart, getTotal, itemCount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
