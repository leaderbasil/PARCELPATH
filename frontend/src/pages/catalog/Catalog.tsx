import { useEffect, useState } from "react";

import { Filters } from "@/components/catalog/Filters";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Button } from "@/components/common/Button";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { useUI } from "@/i18n";
import { config } from "@/config";
import { useCategories, useProducts } from "@/hooks/useProducts";
import type { ProductQuery } from "@/services/products.service";

export default function Catalog() {
  const ui = useUI();
  const [query, setQuery] = useState<ProductQuery>({
    page: 1,
    page_size: config.pageSize,
    sort: "newest",
  });
  const [searchInput, setSearchInput] = useState("");
  const { data, isLoading, isError, error, refetch, isFetching } = useProducts(query);
  const categoriesQuery = useCategories();

  // Debounce the free-text search so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const search = searchInput.trim();
      setQuery((previous) =>
        (previous.search ?? "") === search
          ? previous
          : { ...previous, search: search.length > 0 ? search : undefined, page: 1 }
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const handleFilterChange = (next: ProductQuery): void => {
    setSearchInput(next.search ?? "");
    setQuery((previous) => ({ ...next, search: previous.search, page: 1 }));
  };

  const total = data?.total ?? 0;
  const pageSize = data?.page_size ?? config.pageSize;
  const currentPage = data?.page ?? query.page ?? 1;
  const pageCount = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < pageCount;

  return (
    <div className="w-full">
      <Filters
        categories={categoriesQuery.data ?? []}
        value={{ ...query, search: searchInput }}
        onChange={handleFilterChange}
      />

      {isLoading ? (
        <LoadingState variant="cards" />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <div aria-live="polite" className={isFetching ? "opacity-60" : undefined}>
            <ProductGrid products={data?.items ?? []} />
          </div>
          <nav className="mt-6 flex items-center justify-center gap-4" aria-label="pagination">
            <Button
              variant="secondary"
              disabled={!canGoPrevious || isFetching}
              onClick={() =>
                setQuery((previous) => ({ ...previous, page: Math.max(1, currentPage - 1) }))
              }
            >
              {ui.common.previous}
            </Button>
            <span className="text-sm text-text-muted">
              {currentPage} / {pageCount}
            </span>
            <Button
              variant="secondary"
              disabled={!canGoNext || isFetching}
              onClick={() => setQuery((previous) => ({ ...previous, page: currentPage + 1 }))}
            >
              {ui.common.next}
            </Button>
          </nav>
        </>
      )}
    </div>
  );
}
