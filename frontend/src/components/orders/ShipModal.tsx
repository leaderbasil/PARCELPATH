import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Modal } from "@/components/common/Modal";
import { getErrorMessage } from "@/constants/messages";
import { getCurrentLocale, getTranslation, useI18n, type Locale } from "@/i18n";
import { useShipOrder } from "@/hooks/useOrders";
import { ApiRequestError } from "@/services/api";

function buildSchema(locale: Locale) {
  const messages = getTranslation(locale).validation;
  return z.object({
    carrier: z
      .string()
      .trim()
      .min(2, messages.carrierTooShort)
      .max(100, messages.carrierTooLong),
    tracking_number: z
      .string()
      .trim()
      .min(4, messages.trackingTooShort)
      .max(100, messages.trackingTooLong),
    note: z.string().trim().max(300, messages.noteTooLong).optional(),
  });
}

type ShipFormValues = z.infer<ReturnType<typeof buildSchema>>;

function describeError(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError) return getErrorMessage(error.code, error.message);
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

interface ShipModalProps {
  open: boolean;
  orderId: string;
  onClose: () => void;
}

export function ShipModal({ open, orderId, onClose }: ShipModalProps) {
  const { ui } = useI18n();
  const shipOrder = useShipOrder();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShipFormValues>({
    resolver: (values, context, options) =>
      zodResolver(buildSchema(getCurrentLocale()))(values, context, options),
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
        onError: (error) => setSubmitError(describeError(error, ui.common.error)),
      }
    );
  };

  const busy = shipOrder.isPending;

  return (
    <Modal
      open={open}
      title={ui.admin.shipTitle}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            {ui.common.cancel}
          </Button>
          <Button type="submit" form="ship-order-form" loading={busy}>
            {ui.admin.shipOrder}
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
          label={ui.orders.carrier}
          placeholder={ui.orders.carrier}
          error={errors.carrier?.message}
          disabled={busy}
          {...register("carrier")}
        />
        <Input
          label={ui.orders.trackingNumber}
          placeholder={ui.orders.trackingNumber}
          error={errors.tracking_number?.message}
          disabled={busy}
          dir="ltr"
          {...register("tracking_number")}
        />
        <Input
          label={ui.orders.note}
          placeholder={ui.orders.note}
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
