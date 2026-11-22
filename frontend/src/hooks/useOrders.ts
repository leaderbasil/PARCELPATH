import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersService, type OrderQuery } from "@/services/orders.service";
import type {
  Order,
  OrderCreate,
  OrderShipIn,
  OrderStatusIn,
  ShippingUpdateIn,
} from "@/types/domain";
import { queryKeys } from "./queryKeys";

export function useOrders(params: OrderQuery = {}) {
  return useQuery({ queryKey: queryKeys.orders(params), queryFn: () => ordersService.list(params) });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.order(id ?? ""),
    queryFn: () => ordersService.get(id ?? ""),
    enabled: Boolean(id),
  });
}

export function useTracking(id: string | undefined, active = true) {
  return useQuery({
    queryKey: queryKeys.tracking(id ?? ""),
    queryFn: () => ordersService.tracking(id ?? ""),
    enabled: Boolean(id),
    refetchInterval: active ? 30_000 : false,
  });
}

function useOrderInvalidation() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: ["orders"] });
    void client.invalidateQueries({ queryKey: ["reports"] });
    void client.invalidateQueries({ queryKey: ["products"] });
  };
}

export function useCreateOrder() {
  const client = useQueryClient();
  const invalidate = useOrderInvalidation();
  return useMutation({
    mutationFn: ({ payload, key }: { payload: OrderCreate; key: string }) =>
      ordersService.create(payload, key),
    onSuccess: (order: Order) => {
      invalidate();
      void client.invalidateQueries({ queryKey: queryKeys.order(order.id) });
    },
  });
}

export function useCancelOrder() {
  const invalidate = useOrderInvalidation();
  return useMutation({
    mutationFn: (id: string) => ordersService.cancel(id),
    onSuccess: invalidate,
  });
}

export function useChangeStatus() {
  const invalidate = useOrderInvalidation();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: OrderStatusIn }) =>
      ordersService.changeStatus(id, payload),
    onSuccess: invalidate,
  });
}

export function useShipOrder() {
  const invalidate = useOrderInvalidation();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: OrderShipIn }) =>
      ordersService.ship(id, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateShipping() {
  const invalidate = useOrderInvalidation();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ShippingUpdateIn }) =>
      ordersService.updateShipping(id, payload),
    onSuccess: invalidate,
  });
}
