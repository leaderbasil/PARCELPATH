import { useState } from "react";

import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { useUI } from "@/i18n";
import type { ProductQuery } from "@/services/products.service";
import { cn } from "@/utils/cn";

interface FiltersProps {
  categories: string[];
  value: ProductQuery;
  onChange: (next: ProductQuery) => void;
}

export function Filters({ categories, value, onChange }: FiltersProps) {
  const ui = useUI();
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="mb-6 rounded-card border border-border bg-surface p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          name="search"
          placeholder={ui.common.search}
          value={value.search ?? ""}
          onChange={(event) => onChange({ ...value, search: event.target.value, page: 1 })}
        />

        <Button
          type="button"
          variant="secondary"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          className="w-full sm:hidden"
        >
          {filtersOpen ? ui.catalog.hideFilters : ui.catalog.showFilters}
        </Button>

        <div
          className={cn(
            "grid grid-cols-1 gap-3",
            filtersOpen ? "sm:contents" : "hidden sm:contents"
          )}
        >
          <select
            aria-label={ui.catalog.categories}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            value={value.category ?? ""}
            onChange={(event) =>
              onChange({ ...value, category: event.target.value || undefined, page: 1 })
            }
          >
            <option value="">{ui.common.all}</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <Input
            name="min_price"
            type="number"
            min="0"
            step="0.01"
            placeholder={ui.catalog.priceFrom}
            value={value.min_price ?? ""}
            onChange={(event) =>
              onChange({ ...value, min_price: event.target.value || undefined, page: 1 })
            }
          />

          <Input
            name="max_price"
            type="number"
            min="0"
            step="0.01"
            placeholder={ui.catalog.priceTo}
            value={value.max_price ?? ""}
            onChange={(event) =>
              onChange({ ...value, max_price: event.target.value || undefined, page: 1 })
            }
          />

          <select
            aria-label={ui.catalog.sort}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            value={value.sort ?? "newest"}
            onChange={(event) =>
              onChange({
                ...value,
                sort: event.target.value as NonNullable<ProductQuery["sort"]>,
                page: 1,
              })
            }
          >
            <option value="newest">{ui.catalog.newest}</option>
            <option value="price_asc">{ui.catalog.priceAsc}</option>
            <option value="price_desc">{ui.catalog.priceDesc}</option>
            <option value="name">{ui.catalog.name}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
