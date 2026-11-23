import { UI } from "@/constants/ui";
import { Input } from "@/components/common/Input";
import type { ProductQuery } from "@/services/products.service";

interface FiltersProps {
  categories: string[];
  value: ProductQuery;
  onChange: (next: ProductQuery) => void;
}

export function Filters({ categories, value, onChange }: FiltersProps) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-3 rounded-card border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
      <Input
        name="search"
        placeholder={UI.common.search}
        value={value.search ?? ""}
        onChange={(event) => onChange({ ...value, search: event.target.value, page: 1 })}
      />
      <select
        aria-label={UI.catalog.categories}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        value={value.category ?? ""}
        onChange={(event) => onChange({ ...value, category: event.target.value || undefined, page: 1 })}
      >
        <option value="">{UI.common.all}</option>
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
        placeholder={UI.catalog.priceFrom}
        value={value.min_price ?? ""}
        onChange={(event) => onChange({ ...value, min_price: event.target.value || undefined, page: 1 })}
      />
      <Input
        name="max_price"
        type="number"
        min="0"
        step="0.01"
        placeholder={UI.catalog.priceTo}
        value={value.max_price ?? ""}
        onChange={(event) => onChange({ ...value, max_price: event.target.value || undefined, page: 1 })}
      />
      <select
        aria-label={UI.catalog.sort}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        value={value.sort ?? "newest"}
        onChange={(event) =>
          onChange({ ...value, sort: event.target.value as NonNullable<ProductQuery["sort"]>, page: 1 })
        }
      >
        <option value="newest">{UI.catalog.newest}</option>
        <option value="price_asc">{UI.catalog.priceAsc}</option>
        <option value="price_desc">{UI.catalog.priceDesc}</option>
        <option value="name">{UI.catalog.name}</option>
      </select>
    </div>
  );
}
