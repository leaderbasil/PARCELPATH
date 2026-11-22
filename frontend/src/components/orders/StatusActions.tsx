import { useState } from "react";
import { Button } from "@/components/common/Button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { getErrorMessage } from "@/constants/messages";
import { UI } from "@/constants/ui";
import { useCancelOrder, useChangeStatus } from "@/hooks/useOrders";
import { ApiRequestError } from "@/services/api";
import type { Order, OrderStatus, OrderStatusIn } from "@/types/domain";
import { ALLOWED_TRANSITIONS } from "@/types/domain";
import { cn } from "@/utils/cn";
import { ShipModal } from "./ShipModal";

type ChangeStatusTarget = OrderStatusIn["status"];

const CHANGE_STATUS_LABELS: Record<ChangeStatusTarget, string> = {
  CONFIRMED: UI.admin.confirmOrder,
  PACKED: UI.admin.packOrder,
  OUT_FOR_DELIVERY: UI.admin.outForDelivery,
  DELIVERED: UI.admin.deliverOrder,
};

function isChangeStatusTarget(status: OrderStatus): status is ChangeStatusTarget {
  return (
    status === "CONFIRMED" ||
    status === "PACKED" ||
    status === "OUT_FOR_DELIVERY" ||
    status === "DELIVERED"
  );
}

function describeError(error: unknown): string {
  if (error instanceof ApiRequestError) return getErrorMessage(error.code, error.message);
  if (error instanceof Error && error.message) return error.message;
  return UI.common.error;
}

export function StatusActions({ order, isAdmin }: { order: Order; isAdmin: boolean }) {
  const cancelOrder = useCancelOrder();
  const changeStatus = useChangeStatus();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);

  const allowed = ALLOWED_TRANSITIONS[order.status];
  const changeTargets = isAdmin ? allowed.filter(isChangeStatusTarget) : [];
  const canShip = isAdmin && allowed.includes("SHIPPED");
  const canCancel = isAdmin
    ? order.status === "PENDING" || order.status === "CONFIRMED" || order.status === "PACKED"
    : order.status === "PENDING";

  const isBusy = cancelOrder.isPending || changeStatus.isPending;
  const mutationError = changeStatus.error ?? cancelOrder.error;
  const errorMessage = mutationError ? describeError(mutationError) : null;

  const handleCancel = () => {
    cancelOrder.mutate(order.id, {
      onSuccess: () => setConfirmOpen(false),
    });
  };

  if (isAdmin) {
    if (changeTargets.length === 0 && !canShip && !canCancel) return null;
  } else if (!canCancel) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {changeTargets.map((target) => (
        <Button
          key={target}
          variant={target === "CONFIRMED" ? "primary" : "secondary"}
          disabled={isBusy}
          loading={changeStatus.isPending && changeStatus.variables?.payload.status === target}
          onClick={() => changeStatus.mutate({ id: order.id, payload: { status: target } })}
          className={cn(target === "PACKED" && "px-3 py-1.5 text-xs")}
        >
          {CHANGE_STATUS_LABELS[target]}
        </Button>
      ))}

      {canShip ? (
        <Button
          variant="primary"
          disabled={isBusy}
          onClick={() => setShipOpen(true)}
          className="px-3 py-1.5 text-xs"
        >
          {UI.admin.shipOrder}
        </Button>
      ) : null}

      {canCancel ? (
        <>
          <Button
            variant="danger"
            disabled={isBusy}
            onClick={() => setConfirmOpen(true)}
            className="px-3 py-1.5 text-xs"
          >
            {UI.orders.cancel}
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            title={UI.orders.cancel}
            message={UI.orders.cancelConfirm}
            loading={cancelOrder.isPending}
            onConfirm={handleCancel}
            onCancel={() => setConfirmOpen(false)}
          />
        </>
      ) : null}

      {errorMessage ? (
        <p aria-live="polite" className="w-full text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}

      {canShip ? <ShipModal open={shipOpen} orderId={order.id} onClose={() => setShipOpen(false)} /> : null}
    </div>
  );
}
