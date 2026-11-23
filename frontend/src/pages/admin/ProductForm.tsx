import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Modal } from "@/components/common/Modal";
import { UI } from "@/constants/ui";
import { getErrorMessage } from "@/constants/messages";
import { useCreateProduct, useUpdateProduct } from "@/hooks/useProducts";
import { ApiRequestError } from "@/services/api";
import type { ProductAdmin, ProductCreate } from "@/types/domain";

interface ProductFormProps {
  open: boolean;
  product?: ProductAdmin | undefined;
  onClose: () => void;
}

const schema = z.object({
  name: z.string().trim().min(2, "الاسم يجب ألا يقل عن حرفين"),
  sku: z.string().trim().min(1, "رمز المنتج مطلوب"),
  category: z.string(),
  description: z.string(),
  price: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "أدخل سعرًا صحيحًا بحد أقصى منزلتين عشريتين")
    .refine((value) => Number(value) > 0, "يجب أن يكون السعر أكبر من صفر"),
  stock_quantity: z.coerce
    .number({ invalid_type_error: "أدخل كمية صحيحة" })
    .int("الكمية يجب أن تكون عددًا صحيحًا")
    .min(0, "لا يمكن أن تكون الكمية سالبة"),
  image_url: z.string(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const EMPTY_VALUES: FormValues = {
  name: "",
  sku: "",
  category: "",
  description: "",
  price: "",
  stock_quantity: 0,
  image_url: "",
  is_active: true,
};

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function errorText(error: unknown): string {
  return error instanceof ApiRequestError
    ? getErrorMessage(error.code, error.message)
    : getErrorMessage("INTERNAL_ERROR");
}

export function ProductForm({ open, product, onClose }: ProductFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const pending = createProduct.isPending || updateProduct.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    reset(
      product
        ? {
            name: product.name,
            sku: product.sku,
            category: product.category ?? "",
            description: product.description ?? "",
            price: product.price,
            stock_quantity: product.stock_quantity,
            image_url: product.image_url ?? "",
            is_active: product.is_active,
          }
        : EMPTY_VALUES
    );
  }, [open, product, reset]);

  const onSubmit = (values: FormValues) => {
    setSubmitError(null);
    const payload: ProductCreate = {
      name: values.name.trim(),
      sku: values.sku.trim(),
      price: values.price.trim(),
      stock_quantity: values.stock_quantity,
      is_active: values.is_active,
      description: optionalText(values.description),
      category: optionalText(values.category),
      image_url: optionalText(values.image_url),
    };
    if (product) {
      updateProduct.mutate(
        { id: product.id, payload },
        {
          onSuccess: onClose,
          onError: (error: unknown) => setSubmitError(errorText(error)),
        }
      );
    } else {
      createProduct.mutate(payload, {
        onSuccess: onClose,
        onError: (error: unknown) => setSubmitError(errorText(error)),
      });
    }
  };

  return (
    <Modal
      open={open}
      title={product ? UI.admin.editProduct : UI.admin.newProduct}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {UI.common.cancel}
          </Button>
          <Button type="submit" form="product-form" loading={pending}>
            {UI.common.save}
          </Button>
        </>
      }
    >
      <form
        id="product-form"
        className="space-y-4"
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        noValidate
      >
        <Input label="الاسم" error={errors.name?.message} {...register("name")} />
        <Input label="رمز المنتج" error={errors.sku?.message} {...register("sku")} />
        <Input label="الفئة" error={errors.category?.message} {...register("category")} />
        <div className="w-full">
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-text">
            الوصف
          </label>
          <textarea
            id="description"
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
            {...register("description")}
          />
          {errors.description?.message ? (
            <p className="mt-1 text-xs text-danger">{errors.description.message}</p>
          ) : null}
        </div>
        <Input
          label="السعر"
          inputMode="decimal"
          error={errors.price?.message}
          {...register("price")}
        />
        <Input
          type="number"
          label={UI.admin.stock}
          error={errors.stock_quantity?.message}
          {...register("stock_quantity")}
        />
        <Input
          label="رابط الصورة"
          error={errors.image_url?.message}
          {...register("image_url")}
        />
        <label htmlFor="is_active" className="flex items-center gap-2 text-sm text-text">
          <input id="is_active" type="checkbox" {...register("is_active")} />
          {UI.admin.active}
        </label>
        {submitError ? (
          <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger-strong">
            {submitError}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
