import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { BackIcon } from "@/components/common/Icons";
import { Button } from "@/components/common/Button";
import { DateText } from "@/components/common/DateText";
import { ErrorState } from "@/components/common/ErrorState";
import { Input } from "@/components/common/Input";
import { MapLink } from "@/components/common/MapLink";
import { LoadingState } from "@/components/common/LoadingState";
import { MoneyText } from "@/components/common/MoneyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CourierContactButtons } from "@/components/orders/CourierContactButtons";
import { OrderNumberBadge } from "@/components/orders/OrderNumberBadge";
import { StatusActions } from "@/components/orders/StatusActions";
import { OrderTimeline } from "@/components/tracking/OrderTimeline";
import { getErrorMessage, statusLabel } from "@/constants/messages";
import { UI } from "@/constants/ui";
import { useOrder, useTracking, useUpdateShipping } from "@/hooks/useOrders";
import { ApiRequestError } from "@/services/api";
import type { ShippingUpdateIn } from "@/types/domain";

const schema = z.object({
  carrier: z.string(),
  tracking_number: z.string(),
  note: z.string(),
});

type FormValues = z.infer<typeof schema>;

const EMPTY_VALUES: FormValues = { carrier: "", tracking_number: "", note: "" };

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function errorText(error: unknown): string {
  return error instanceof ApiRequestError
    ? getErrorMessage(error.code, error.message)
    : getErrorMessage("INTERNAL_ERROR");
}

export default function AdminOrderDetails() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const orderQuery = useOrder(id);
  const trackingQuery = useTracking(id);
  const updateShipping = useUpdateShipping();
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_VALUES });

  const order = orderQuery.data;
  useEffect(() => {
    if (!order) return;
    setFormError(null);
    setSaved(false);
    reset({
      carrier: order.carrier ?? "",
      tracking_number: order.tracking_number ?? "",
      note: "",
    });
  }, [order, reset]);

  if (orderQuery.isLoading) return <LoadingState variant="orderDetail" />;
  if (orderQuery.isError) {
    return <ErrorState error={orderQuery.error} onRetry={() => void orderQuery.refetch()} />;
  }
  if (!order) return <ErrorState error={new Error(UI.common.error)} />;

  const shippingLocked = !["SHIPPED", "OUT_FOR_DELIVERY"].includes(order.status);

  const onSubmit = (values: FormValues) => {
    setFormError(null);
    setSaved(false);
    if (!values.carrier?.trim() && !values.tracking_number?.trim()) {
      setFormError("أدخل بيانات الناقل أو رقم التتبّع على الأقل.");
      return;
    }
    const payload: ShippingUpdateIn = {
      carrier: optionalText(values.carrier),
      tracking_number: optionalText(values.tracking_number),
      note: optionalText(values.note),
    };
    updateShipping.mutate(
      { id: order.id, payload },
      {
        onSuccess: () => setSaved(true),
        onError: (error: unknown) => setFormError(errorText(error)),
      }
    );
  };

  return (
    <main className="mx-auto w-full max-w-none space-y-6 p-4 py-10">
      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <OrderNumberBadge number={order.order_number} />
            <p className="mt-2 text-sm text-text-muted">
              <DateText value={order.created_at} />
            </p>
            {order.customer ? (
              <p className="mt-1 text-sm text-text-muted">
                {order.customer.full_name} · {order.customer.email}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={order.status} />
            <MoneyText value={order.total_amount} className="text-xl font-bold text-primary-strong" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusActions order={order} isAdmin />
        </div>
      </div>

      <section className="rounded-card border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-4 text-lg font-semibold text-text">{UI.orders.items}</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-right text-text-muted">
                <th className="p-2 font-medium">{UI.catalog.name}</th>
                <th className="p-2 font-medium">SKU</th>
                <th className="p-2 font-medium">{UI.orders.items}</th>
                <th className="p-2 font-medium">سعر الوحدة</th>
                <th className="p-2 font-medium">{UI.cart.total}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.product_id} className="border-b border-border text-text">
                  <td className="p-2">{item.product_name}</td>
                  <td className="p-2 text-text-muted" dir="ltr">
                    {item.sku}
                  </td>
                  <td className="p-2">{item.quantity}</td>
                  <td className="p-2">
                    <MoneyText value={item.unit_price} />
                  </td>
                  <td className="p-2">
                    <MoneyText value={item.line_total} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">{UI.cart.subtotal}</dt>
            <dd>
              <MoneyText value={order.subtotal} />
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">{UI.cart.shippingFee}</dt>
            <dd>
              <MoneyText value={order.shipping_fee} />
            </dd>
          </div>
          <div className="flex justify-between gap-4 font-semibold text-primary-strong">
            <dt>{UI.cart.total}</dt>
            <dd>
              <MoneyText value={order.total_amount} />
            </dd>
          </div>
        </dl>
      </section>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-card border border-border bg-surface p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-text">{UI.checkout.shippingInfo}</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">{UI.checkout.fullName}</dt>
              <dd className="text-text">{order.shipping.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">{UI.checkout.phone}</dt>
              <dd className="text-text" dir="ltr">
                {order.shipping.phone}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">{UI.checkout.city}</dt>
              <dd className="text-text">{order.shipping.city}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">{UI.checkout.address}</dt>
              <dd className="text-right text-text">{order.shipping.address}</dd>
            </div>
            <div className="pt-1">
              <MapLink query={order.shipping.map_query} url={order.shipping.map_url} />
            </div>
          </dl>
        </div>
        <div className="rounded-card border border-border bg-surface p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-text">{UI.orders.track}</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">{UI.checkout.paymentMethod}</dt>
              <dd className="text-text">
                {order.payment_method === "COD" ? UI.checkout.cod : UI.checkout.card}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">{UI.orders.status}</dt>
              <dd className="text-text">{order.payment_status === "PAID" ? "مدفوع" : "غير مدفوع"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">{UI.orders.carrier}</dt>
              <dd className="text-text">{order.carrier ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">{UI.orders.trackingNumber}</dt>
              <dd className="text-text" dir="ltr">
                {order.tracking_number ?? "—"}
              </dd>
            </div>
            {order.courier_phone ? (
              <div className="pt-1">
                <p className="mb-2 text-text-muted">{UI.orders.courierPhone}</p>
                <CourierContactButtons phone={order.courier_phone} />
              </div>
            ) : null}
          </dl>
          <p className="mt-4 text-xs text-text-muted">{statusLabel(order.status)}</p>
        </div>
      </section>

      <section className="rounded-card border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-1 text-lg font-semibold text-text">{UI.admin.shipTitle}</h2>
        <p className="mb-4 text-sm text-text-muted">
          {shippingLocked ? "لا يمكن تعديل بيانات الشحن في هذه الحالة." : "تصحيح بيانات الناقل ورقم التتبّع."}
        </p>
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={UI.orders.carrier}
              disabled={shippingLocked || updateShipping.isPending}
              error={errors.carrier?.message}
              {...register("carrier")}
            />
            <Input
              label={UI.orders.trackingNumber}
              disabled={shippingLocked || updateShipping.isPending}
              error={errors.tracking_number?.message}
              {...register("tracking_number")}
            />
          </div>
          <Input
            label="ملاحظة"
            disabled={shippingLocked || updateShipping.isPending}
            error={errors.note?.message}
            {...register("note")}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={shippingLocked || updateShipping.isPending}
              loading={updateShipping.isPending}
            >
              {UI.common.save}
            </Button>
            {saved ? <span className="text-sm text-success-strong">تم حفظ التعديلات.</span> : null}
          </div>
          {formError ? (
            <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger-strong">
              {formError}
            </p>
          ) : null}
        </form>
      </section>

      {trackingQuery.isError ? (
        <ErrorState error={trackingQuery.error} onRetry={() => void trackingQuery.refetch()} />
      ) : trackingQuery.isLoading ? (
        <LoadingState variant="tracking" count={3} />
      ) : (
        <OrderTimeline
          events={trackingQuery.data?.events ?? []}
          currentStatus={trackingQuery.data?.status ?? order.status}
        />
      )}

      <Link to="/admin/orders" className="mt-6 inline-block">
        <Button variant="secondary">
          <BackIcon className="h-4 w-4" />
          {UI.common.back}
        </Button>
      </Link>
    </main>
  );
}
