import { EmptyState } from "@/components/common/EmptyState";
import { useUI } from "@/i18n";
import type { OrderListItem } from "@/types/domain";
import { OrderRow } from "./OrderRow";

interface OrderListProps {
  orders: OrderListItem[];
  onOpen?: (id: string) => void;
  isAdmin?: boolean;
}

export function OrderList({ orders, onOpen, isAdmin = false }: OrderListProps) {
  const ui = useUI();
  if (orders.length === 0) return <EmptyState message={ui.orders.empty} />;

  return (
    <ul className="space-y-3">
      {orders.map((order) => (
        <li key={order.id}>
          <OrderRow order={order} onOpen={onOpen} isAdmin={isAdmin} />
        </li>
      ))}
    </ul>
  );
}
