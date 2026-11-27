import { useEffect, useState, type ChangeEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Modal } from "@/components/common/Modal";
import { ProductImage } from "@/components/common/ProductImage";
import { getCurrentLocale, getTranslation, useI18n, type Locale } from "@/i18n";
import { getErrorMessage } from "@/constants/messages";
import { useCategories, useCreateProduct, useUpdateProduct } from "@/hooks/useProducts";
import { ApiRequestError } from "@/services/api";
import { isDemoMode } from "@/services/demoMode";
import { isObjectRef, putImage } from "@/services/objectStorage";
import type { ProductAdmin, ProductCreate } from "@/types/domain";

interface ProductFormProps {
  open: boolean;
  product?: ProductAdmin | undefined;
  onClose: () => void;
}

const NEW_CATEGORY_VALUE = "__new_category__";

function isImageReference(value: string): boolean {
  if (isObjectRef(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function buildSchema(locale: Locale) {
  const messages = getTranslation(locale).validation;
  return z
    .object({
      name: z.string().trim().min(2, messages.nameTooShort),
      sku: z.string().trim().min(1, messages.skuRequired),
      category: z.string().min(1, messages.categoryRequired),
      newCategory: z.string().trim().max(60, messages.categoryNameTooLong).optional(),
      description: z.string(),
      price: z
        .string()
        .trim()
        .regex(/^\d+(\.\d{1,2})?$/, messages.priceInvalid)
        .refine((value) => Number(value) > 0, messages.priceTooSmall),
      stock_quantity: z.coerce
        .number({ invalid_type_error: messages.quantityRequired })
        .int(messages.quantityInteger)
        .min(0, messages.quantityNegative),
      image_url: z.union([
        z.literal(""),
        z.string().refine(isImageReference, messages.imageInvalid),
      ]),
      is_active: z.boolean(),
    })
    .superRefine((values, ctx) => {
      if (values.category === NEW_CATEGORY_VALUE && !values.newCategory?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["newCategory"],
          message: messages.categoryNameRequired,
        });
      }
    });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

const EMPTY_VALUES: FormValues = {
  name: "",
  sku: "",
  category: "",
  newCategory: "",
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
  const { ui, t } = useI18n();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const categories = useCategories();
  const pending = createProduct.isPending || updateProduct.isPending || uploading;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: (values, context, options) =>
      zodResolver(buildSchema(getCurrentLocale()))(values, context, options),
    defaultValues: EMPTY_VALUES,
  });

  const imageValue = watch("image_url");
  const selectedCategory = watch("category");
  const categoryField = register("category");
  const categoryOptions = Array.from(
    new Set([...(categories.data ?? []), ...(product?.category ? [product.category] : [])])
  ).filter((value) => value.length > 0);

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    setUploadError(null);
    reset(
      product
        ? {
            name: product.name,
            sku: product.sku,
            category: product.category ?? "",
            newCategory: "",
            description: product.description ?? "",
            price: product.price,
            stock_quantity: product.stock_quantity,
            image_url: product.image_url ?? "",
            is_active: product.is_active,
          }
        : EMPTY_VALUES
    );
  }, [open, product, reset]);

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const reference = await putImage(file);
      setValue("image_url", reference, { shouldValidate: true, shouldDirty: true });
    } catch (error: unknown) {
      setUploadError(error instanceof Error ? error.message : t("validation.imageSaveFailed"));
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = (values: FormValues) => {
    setSubmitError(null);
    const category =
      values.category === NEW_CATEGORY_VALUE
        ? values.newCategory?.trim() ?? ""
        : values.category.trim();
    const payload: ProductCreate = {
      name: values.name.trim(),
      sku: values.sku.trim(),
      price: values.price.trim(),
      stock_quantity: values.stock_quantity,
      is_active: values.is_active,
      description: optionalText(values.description),
      category,
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
      title={product ? ui.admin.editProduct : ui.admin.newProduct}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {ui.common.cancel}
          </Button>
          <Button type="submit" form="product-form" loading={pending}>
            {ui.common.save}
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
        <Input label={ui.catalog.name} error={errors.name?.message} {...register("name")} />
        <Input label={ui.admin.sku} error={errors.sku?.message} {...register("sku")} />

        <div className="w-full min-w-0">
          <label htmlFor="category" className="mb-1 block text-sm font-medium text-text">
            {ui.catalog.categories}
          </label>
          <select
            id="category"
            aria-invalid={errors.category ? true : undefined}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            {...categoryField}
            onChange={(event) => {
              void categoryField.onChange(event);
              if (event.target.value !== NEW_CATEGORY_VALUE) {
                setValue("newCategory", "", { shouldValidate: true, shouldDirty: true });
              }
            }}
          >
            <option value="">{ui.admin.chooseCategory}</option>
            {categoryOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
            <option value={NEW_CATEGORY_VALUE}>{ui.admin.newCategory}</option>
          </select>
          {errors.category?.message ? (
            <p className="mt-1 text-xs text-danger">{errors.category.message}</p>
          ) : null}
          {selectedCategory === NEW_CATEGORY_VALUE ? (
            <div className="mt-3">
              <Input
                label={ui.admin.newCategoryName}
                error={errors.newCategory?.message}
                {...register("newCategory")}
              />
            </div>
          ) : null}
        </div>

        <div className="w-full min-w-0">
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-text">
            {ui.admin.description}
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
          label={ui.admin.price}
          inputMode="decimal"
          error={errors.price?.message}
          {...register("price")}
        />
        <Input
          type="number"
          label={ui.admin.stock}
          error={errors.stock_quantity?.message}
          {...register("stock_quantity")}
        />

        <div className="w-full min-w-0">
          <span className="mb-1 block text-sm font-medium text-text">{ui.admin.attachImage}</span>
          <input type="hidden" {...register("image_url")} />
          <ProductImage
            src={imageValue}
            alt={product ? product.name : ui.admin.imagePreview}
            className="h-24 w-full rounded-lg border border-border"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label
              htmlFor="product-image"
              className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-text hover:bg-primary-soft focus-within:ring-2 focus-within:ring-primary/30"
            >
              {uploading ? ui.admin.uploadingImage : imageValue ? ui.admin.changeImage : ui.admin.attachImage}
            </label>
            <input
              id="product-image"
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => void handleImageChange(event)}
            />
            {imageValue ? (
              <Button
                type="button"
                variant="ghost"
                disabled={uploading}
                onClick={() =>
                  setValue("image_url", "", { shouldValidate: true, shouldDirty: true })
                }
              >
                {ui.admin.removeImage}
              </Button>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-5 text-text-muted">
            {isDemoMode()
              ? ui.admin.imageHint
              : ui.admin.imageUploadHint}
          </p>
          {uploadError ? (
            <p role="alert" className="mt-1 text-xs text-danger">
              {uploadError}
            </p>
          ) : null}
          {errors.image_url?.message ? (
            <p className="mt-1 text-xs text-danger">{errors.image_url.message}</p>
          ) : null}
        </div>

        <label htmlFor="is_active" className="flex items-center gap-2 text-sm text-text">
          <input id="is_active" type="checkbox" {...register("is_active")} />
          {ui.admin.active}
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
