import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Modal } from "@/components/common/Modal";
import { getErrorMessage } from "@/constants/messages";
import { UI } from "@/constants/ui";
import { useShipOrder } from "@/hooks/useOrders";
import { ApiRequestError } from "@/services/api";

const shipSchema = z.object({
  carrier: z.string().trim().min(2, "اسم الناقل قصير جدًا").max(100, "اسم الناقل طويل جدًا"),
  tracking_number: z
    .string()
    .trim()
    .min(4, "رقم التتبّع قصير جدًا")
    .max(100, "رقم التتبّع طويل جدًا"),
  note: z.string().trim().max(300, "الملاحظة طويلة جدًا").optional(),
});

type ShipFormValues = z.infer<typeof shipSchema>;

function describeError(error: unknown): string {
  if (error instanceof ApiRequestError) return getErrorMessage(error.code, error.message);
  if (error instanceof Error && error.message) return error.message;
  return UI.common.error;
}

interface ShipModalProps {
  open: boolean;
  orderId: string;
  onClose: () => void;
}

export function ShipModal({ open, orderId, onClose }: ShipModalProps) {
  const shipOrder = useShipOrder();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShipFormValues>({
    resolver: zodResolver(shipSchema),
    defaultValues: { carrier: "", tracking_number: "", note: "" },
  });

  const onSubmit = (values: ShipFormValues) => {
    setSubmitError(null);
    shipOrder.mutate(
      {
        id: orderId,
        payload: {
          carrier: values.carrier,
          tracking_number: values.tracking_number,
          note: values.note ? values.note : undefined,
        },
      },
      {
        onSuccess: () => {
          reset();
          setSubmitError(null);
          onClose();
        },
        onError: (error) => setSubmitError(describeError(error)),
      }
    );
  };

  const busy = shipOrder.isPending;

  return (
    <Modal
      open={open}
      title={UI.admin.shipTitle}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            {UI.common.cancel}
          </Button>
          <Button type="submit" form="ship-order-form" loading={busy}>
            {UI.admin.shipOrder}
          </Button>
        </>
      }
    >
      <form
        id="ship-order-form"
        className="space-y-4"
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
        noValidate
      >
        <Input
          label={UI.orders.carrier}
          placeholder={UI.orders.carrier}
          error={errors.carrier?.message}
          disabled={busy}
          {...register("carrier")}
        />
        <Input
          label={UI.orders.trackingNumber}
          placeholder={UI.orders.trackingNumber}
          error={errors.tracking_number?.message}
          disabled={busy}
          dir="ltr"
          {...register("tracking_number")}
        />
        <Input
          label="ملاحظة"
          placeholder="ملاحظة"
          error={errors.note?.message}
          disabled={busy}
          {...register("note")}
        />
        {submitError ? (
          <p aria-live="polite" className="text-sm text-danger">
            {submitError}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
