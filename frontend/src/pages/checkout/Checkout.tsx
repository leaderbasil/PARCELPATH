import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { Input } from "@/components/common/Input";
import { MoneyText } from "@/components/common/MoneyText";
import { getErrorMessage } from "@/constants/messages";
import { UI } from "@/constants/ui";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useCreateOrder } from "@/hooks/useOrders";
import { ApiRequestError } from "@/services/api";
import { isDemoMode } from "@/services/demoMode";
import { clearIdempotencyKey, getIdempotencyKey } from "@/utils/idempotency";

const checkoutSchema = z.object({
  name: z.string().trim().min(2, "الاسم يجب ألا يقل عن حرفين"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{7,30}$/, "أدخل رقم هاتف صحيحًا"),
  city: z.string().trim().min(2, "المدينة يجب ألا تقل عن حرفين"),
  address: z.string().trim().min(10, "العنوان يجب ألا يقل عن 10 أحرف"),
  payment_method: z.enum(["COD", "CARD"], {
    errorMap: () => ({ message: "يرجى اختيار طريقة الدفع" }),
  }),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const { user, isAuthenticated } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const createOrder = useCreateOrder();
  const [formError, setFormError] = useState<string | null>(null);
  const [stockIssue, setStockIssue] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: user?.full_name ?? "",
      phone: user?.phone ?? "",
      city: "",
      address: "",
      payment_method: "COD",
    },
  });

  // Guards live in the page as well as in ProtectedRoute: admins may never check out.
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: "/checkout" }} />;
  }
  if (user.role === "ADMIN" && !isDemoMode()) {
    return <Navigate to="/admin" replace />;
  }

  if (cart.items.length === 0) {
    return (
      <main className="mx-auto max-w-5xl p-4 py-10">
        <h1 className="mb-6 text-2xl font-bold text-text">{UI.checkout.title}</h1>
        <EmptyState message={UI.cart.empty} />
        <div className="mt-6 text-center">
          <Link to="/" className="text-sm font-medium text-primary-strong underline">
            {UI.cart.continueShopping}
          </Link>
        </div>
      </main>
    );
  }

  const onSubmit = async (values: CheckoutValues): Promise<void> => {
    setFormError(null);
    setStockIssue(false);
    try {
      const order = await createOrder.mutateAsync({
        payload: {
          items: cart.items.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
          })),
          payment_method: values.payment_method,
          shipping: {
            name: values.name,
            phone: values.phone,
            city: values.city,
            address: values.address,
          },
        },
        // Reused on retry so the server replays instead of creating a duplicate order.
        key: getIdempotencyKey(),
      });
      clearIdempotencyKey();
      cart.clearCart();
      navigate(`/orders/${order.id}`, { replace: true });
    } catch (error: unknown) {
      // Keep the cart and the idempotency key intact so a retry is safe.
      if (error instanceof ApiRequestError) {
        let message = getErrorMessage(error.code, error.message);
        const meta = error.meta as { items?: unknown[] } | undefined;
        const failingItems = meta?.items;
        if (error.code === "INSUFFICIENT_STOCK" && failingItems !== undefined) {
          const first: unknown = failingItems[0];
          if (first !== null && typeof first === "object" && "available" in first) {
            const available: unknown = first.available;
            if (typeof available === "number") {
              message = `${message} (${UI.admin.stock}: ${available})`;
            }
          }
        }
        setFormError(message);
        setStockIssue(error.code === "INSUFFICIENT_STOCK");
      } else {
        setFormError(getErrorMessage("INTERNAL_ERROR"));
        setStockIssue(false);
      }
    }
  };

  const submitting = isSubmitting || createOrder.isPending;

  return (
    <main className="mx-auto max-w-5xl p-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-text">{UI.checkout.title}</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
        <form
          noValidate
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
          className="space-y-5 rounded-card border border-border bg-surface p-6 shadow-card"
        >
          <h2 className="text-lg font-semibold text-text">{UI.checkout.shippingInfo}</h2>
          <Input
            label={UI.checkout.fullName}
            autoComplete="name"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label={UI.checkout.phone}
            type="tel"
            autoComplete="tel"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <Input
            label={UI.checkout.city}
            autoComplete="address-level2"
            error={errors.city?.message}
            {...register("city")}
          />
          <Input
            label={UI.checkout.address}
            autoComplete="street-address"
            error={errors.address?.message}
            {...register("address")}
          />

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-text">
              {UI.checkout.paymentMethod}
            </legend>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-text">
                <input type="radio" value="COD" {...register("payment_method")} />
                {UI.checkout.cod}
              </label>
              <label className="flex items-center gap-2 text-sm text-text">
                <input type="radio" value="CARD" {...register("payment_method")} />
                {UI.checkout.card}
              </label>
            </div>
            {errors.payment_method?.message ? (
              <p className="mt-1 text-xs text-danger">{errors.payment_method.message}</p>
            ) : null}
          </fieldset>

          {formError ? (
            <div role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
              <p>{formError}</p>
              {stockIssue ? (
                <Link to="/cart" className="mt-2 inline-block text-primary-strong underline">
                  {UI.cart.continueShopping}
                </Link>
              ) : null}
            </div>
          ) : null}

          <Button type="submit" loading={submitting} className="w-full">
            {submitting ? UI.checkout.submitting : UI.checkout.placeOrder}
          </Button>
        </form>

        <aside className="h-fit rounded-card border border-border bg-surface p-5 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-text">{UI.cart.title}</h2>
          <ul className="mb-4 space-y-2">
            {cart.items.map((item) => (
              <li key={item.product_id} className="flex justify-between gap-3 text-sm">
                <span className="text-text-muted">
                  {item.name} × {item.quantity}
                </span>
                <span className="text-text">
                  <MoneyText value={item.price} />
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-text-muted">{UI.cart.subtotal}</span>
            <MoneyText value={cart.getTotal()} className="text-lg font-bold text-text" />
          </div>
          <p className="mt-3 text-xs text-text-muted">يتم تحديد رسوم الشحن من قبل الخادم.</p>
        </aside>
      </div>
    </main>
  );
}
