import type { Product, ProductAdmin } from "@/types/domain";
import { UI } from "@/constants/ui";
import { ProductCard } from "./ProductCard";
import { EmptyState } from "@/components/common/EmptyState";

export function ProductGrid({ products }: { products: (Product | ProductAdmin)[] }) {
  if (products.length === 0) return <EmptyState message={UI.common.noResults} />;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
