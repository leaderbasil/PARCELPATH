import { EmptyState } from "@/components/common/EmptyState";
import { UI } from "@/constants/ui";
import type { OrderListItem } from "@/types/domain";
import { OrderRow } from "./OrderRow";

interface OrderListProps {
  orders: OrderListItem[];
  onOpen?: (id: string) => void;
  isAdmin?: boolean;
}

export function OrderList({ orders, onOpen, isAdmin = false }: OrderListProps) {
  if (orders.length === 0) return <EmptyState message={UI.orders.empty} />;

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
