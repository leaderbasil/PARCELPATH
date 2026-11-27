import { useState } from "react";
import { Button } from "@/components/common/Button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Input } from "@/components/common/Input";
import { LoadingState } from "@/components/common/LoadingState";
import { MoneyText } from "@/components/common/MoneyText";
import { ProductImage } from "@/components/common/ProductImage";
import { config } from "@/config";
import { useUI } from "@/i18n";
import { getErrorMessage } from "@/constants/messages";
import { useCategories, useDisableProduct, useProducts } from "@/hooks/useProducts";
import { ApiRequestError } from "@/services/api";
import type { Product, ProductAdmin } from "@/types/domain";
import { ProductForm } from "./ProductForm";

interface DisableTarget {
  id: string;
  name: string;
}

function asAdminProduct(product: Product | ProductAdmin): ProductAdmin {
  if ("stock_quantity" in product && "is_active" in product) return product;
  return {
    ...product,
    stock_quantity: 0,
    is_active: product.in_stock,
    created_at: "",
    updated_at: "",
  };
}

function mutationError(error: unknown): string {
  return error instanceof ApiRequestError ? getErrorMessage(error.code, error.message) : getErrorMessage("INTERNAL_ERROR");
}

export default function AdminProducts() {
  const ui = useUI();
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductAdmin | undefined>(undefined);
  const [disableTarget, setDisableTarget] = useState<DisableTarget | null>(null);

  const categories = useCategories();
  const products = useProducts({
    page,
    page_size: config.pageSize,
    ...(search ? { search } : {}),
    ...(category ? { category } : {}),
    ...(activeFilter === "active" ? { is_active: true } : {}),
    ...(activeFilter === "inactive" ? { is_active: false } : {}),
  });
  const disableProduct = useDisableProduct();

  const totalPages = Math.max(1, Math.ceil((products.data?.total ?? 0) / config.pageSize));
  const applyFilters = () => {
    setPage(1);
    setSearch(searchDraft.trim());
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditing(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          {ui.admin.newProduct}
        </Button>
      </div>

      <form
        className="grid gap-3 rounded-card border border-border bg-surface p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters();
        }}
      >
        <Input
          name="search"
          label={ui.common.search}
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
        />
        <div className="w-full">
          <label htmlFor="category" className="mb-1 block text-sm font-medium text-text">
            {ui.catalog.categories}
          </label>
          <select
            id="category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{ui.common.all}</option>
            {(categories.data ?? []).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full">
          <label htmlFor="active" className="mb-1 block text-sm font-medium text-text">
            {ui.admin.active}
          </label>
          <select
            id="active"
            value={activeFilter}
            onChange={(event) => {
              setActiveFilter(event.target.value as "all" | "active" | "inactive");
              setPage(1);
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">{ui.common.all}</option>
            <option value="active">{ui.admin.active}</option>
            <option value="inactive">{ui.admin.inactive}</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit">{ui.common.search}</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSearchDraft("");
              setSearch("");
              setCategory("");
              setActiveFilter("all");
              setPage(1);
            }}
          >
            {ui.common.cancel}
          </Button>
        </div>
      </form>

      {disableProduct.error ? (
        <p role="alert" className="rounded-card border border-danger bg-danger-soft p-3 text-sm text-danger-strong">
          {mutationError(disableProduct.error)}
        </p>
      ) : null}

      {products.isLoading ? (
        <LoadingState variant="adminProducts" />
      ) : products.error ? (
        <ErrorState error={products.error} onRetry={() => void products.refetch()} />
      ) : !products.data || products.data.items.length === 0 ? (
        <EmptyState message={ui.common.noResults} />
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-card">
          <table className="w-full text-right text-sm">
            <thead className="bg-background text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{ui.catalog.name}</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">{ui.catalog.categories}</th>
                <th className="px-4 py-3 font-medium">{ui.cart.total}</th>
                <th className="px-4 py-3 font-medium">{ui.admin.stock}</th>
                <th className="px-4 py-3 font-medium">{ui.admin.active}</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.data.items.map((product) => {
                const admin = "stock_quantity" in product ? product : undefined;
                return (
                  <tr key={product.id} className="text-text">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProductImage
                          src={product.image_url}
                          alt={product.name}
                          className="h-10 w-10 shrink-0 rounded-lg border border-border"
                        />
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-muted" dir="ltr">
                      {product.sku}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{product.category ?? "—"}</td>
                    <td className="px-4 py-3">
                      <MoneyText value={product.price} />
                    </td>
                    <td className="px-4 py-3">{admin?.stock_quantity ?? "—"}</td>
                    <td className="px-4 py-3">
                      {(admin?.is_active ?? product.in_stock) ? (
                        <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success-strong">
                          {ui.admin.active}
                        </span>
                      ) : (
                        <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-medium text-danger-strong">
                          {ui.admin.inactive}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditing(asAdminProduct(product));
                            setFormOpen(true);
                          }}
                        >
                          {ui.common.edit}
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={disableProduct.isPending}
                          onClick={() => setDisableTarget({ id: product.id, name: product.name })}
                        >
                          {ui.common.delete}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {products.data && products.data.total > 0 ? (
        <div className="flex items-center justify-between gap-4 rounded-card border border-border bg-surface px-4 py-3 shadow-card">
          <span className="text-sm text-text-muted">
            {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {ui.common.previous}
            </Button>
            <Button
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              {ui.common.next}
            </Button>
          </div>
        </div>
      ) : null}

      <ProductForm open={formOpen} product={editing} onClose={closeForm} />

      <ConfirmDialog
        open={disableTarget !== null}
        title={ui.common.delete}
        message={`${ui.admin.deactivateConfirm}${disableTarget ? ` (${disableTarget.name})` : ""}`}
        loading={disableProduct.isPending}
        onCancel={() => setDisableTarget(null)}
        onConfirm={() => {
          if (!disableTarget) return;
          disableProduct.mutate(disableTarget.id, {
            onSuccess: () => setDisableTarget(null),
          });
        }}
      />
    </div>
  );
}
