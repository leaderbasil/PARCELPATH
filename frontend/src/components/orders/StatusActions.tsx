import { useState } from "react";
import { Button } from "@/components/common/Button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { getErrorMessage } from "@/constants/messages";
import { useUI } from "@/i18n";
import { useCancelOrder, useChangeStatus } from "@/hooks/useOrders";
import { ApiRequestError } from "@/services/api";
import type { Order, OrderStatus, OrderStatusIn } from "@/types/domain";
import { ALLOWED_TRANSITIONS } from "@/types/domain";
import { cn } from "@/utils/cn";
import { ShipModal } from "./ShipModal";

type ChangeStatusTarget = OrderStatusIn["status"];

function isChangeStatusTarget(status: OrderStatus): status is ChangeStatusTarget {
  return (
    status === "CONFIRMED" ||
    status === "PACKED" ||
    status === "OUT_FOR_DELIVERY" ||
    status === "DELIVERED"
  );
}

function describeError(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError) return getErrorMessage(error.code, error.message);
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function StatusActions({ order, isAdmin }: { order: Order; isAdmin: boolean }) {
  const ui = useUI();
  const changeStatusLabels: Record<ChangeStatusTarget, string> = {
    CONFIRMED: ui.admin.confirmOrder,
    PACKED: ui.admin.packOrder,
    OUT_FOR_DELIVERY: ui.admin.outForDelivery,
    DELIVERED: ui.admin.deliverOrder,
  };
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
  const errorMessage = mutationError ? describeError(mutationError, ui.common.error) : null;

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
          {changeStatusLabels[target]}
        </Button>
      ))}

      {canShip ? (
        <Button
          variant="primary"
          disabled={isBusy}
          onClick={() => setShipOpen(true)}
          className="px-3 py-1.5 text-xs"
        >
          {ui.admin.shipOrder}
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
            {ui.orders.cancel}
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            title={ui.orders.cancel}
            message={ui.orders.cancelConfirm}
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
