import type { Page, Product, ProductAdmin, ProductCreate, ProductUpdate } from "@/types/domain";
import { toSubunits } from "@/utils/money";

import { api, unwrap } from "./api";
import { demoError, isDemoMode, paginateDemoItems } from "./demoMode";
import {
  getStoredDemoCategories,
  getStoredDemoProducts,
  makeDemoId,
  saveDemoCategory,
  saveDemoProducts,
} from "./mockDemoData";

export interface ProductQuery {
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
  min_price?: string;
  max_price?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "name";
  is_active?: boolean;
}

const PRICE_PATTERN = /^\d+(?:\.\d{1,2})?$/;

function matchesSearch(product: ProductAdmin, term: string): boolean {
  return [product.name, product.sku, product.description ?? "", product.category ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(term);
}

function sortProducts(products: ProductAdmin[], sort: ProductQuery["sort"]): ProductAdmin[] {
  const sorted = [...products];
  switch (sort) {
    case "price_asc":
      return sorted.sort((a, b) => toSubunits(a.price) - toSubunits(b.price) || a.id.localeCompare(b.id));
    case "price_desc":
      return sorted.sort((a, b) => toSubunits(b.price) - toSubunits(a.price) || a.id.localeCompare(b.id));
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "ar") || a.id.localeCompare(b.id));
    case "newest":
    default:
      return sorted.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || a.id.localeCompare(b.id)
      );
  }
}

function assertPrice(price: string): void {
  if (!PRICE_PATTERN.test(price)) throw demoError("VALIDATION_ERROR", 422);
}

export const productsService = {
  async list(params: ProductQuery = {}): Promise<Page<Product | ProductAdmin>> {
    if (!isDemoMode()) {
      return unwrap(api.get<{ data: Page<Product | ProductAdmin> }>("/products", { params }));
    }

    let products = getStoredDemoProducts();
    const search = (params.search ?? "").trim().toLowerCase();
    if (search) products = products.filter((product) => matchesSearch(product, search));

    const category = (params.category ?? "").trim().toLowerCase();
    if (category) {
      products = products.filter(
        (product) => (product.category ?? "").toLowerCase() === category
      );
    }

    if (params.is_active !== undefined) {
      products = products.filter((product) => product.is_active === params.is_active);
    }
    if (params.min_price !== undefined && params.min_price !== "") {
      const min = toSubunits(params.min_price);
      products = products.filter((product) => toSubunits(product.price) >= min);
    }
    if (params.max_price !== undefined && params.max_price !== "") {
      const max = toSubunits(params.max_price);
      products = products.filter((product) => toSubunits(product.price) <= max);
    }

    return paginateDemoItems(sortProducts(products, params.sort), params);
  },

  async get(id: string): Promise<Product | ProductAdmin> {
    if (!isDemoMode()) return unwrap(api.get<{ data: Product | ProductAdmin }>(`/products/${id}`));
    const product = getStoredDemoProducts().find((item) => item.id === id);
    if (!product) throw demoError("PRODUCT_NOT_FOUND", 404);
    return product;
  },

  async categories(): Promise<string[]> {
    if (!isDemoMode()) return unwrap(api.get<{ data: string[] }>("/products/categories"));
    const categories = new Set<string>(getStoredDemoCategories());
    getStoredDemoProducts().forEach((product) => {
      if (product.is_active && product.category) categories.add(product.category);
    });
    return [...categories].sort((a, b) => a.localeCompare(b, "ar"));
  },

  async lowStock(threshold = 5): Promise<ProductAdmin[]> {
    if (!isDemoMode()) {
      return unwrap(api.get<{ data: ProductAdmin[] }>("/products/low-stock", { params: { threshold } }));
    }
    return getStoredDemoProducts()
      .filter((product) => product.is_active && product.stock_quantity <= threshold)
      .sort(
        (a, b) =>
          a.stock_quantity - b.stock_quantity ||
          a.name.localeCompare(b.name, "ar") ||
          a.id.localeCompare(b.id)
      );
  },

  async create(payload: ProductCreate): Promise<ProductAdmin> {
    if (!isDemoMode()) return unwrap(api.post<{ data: ProductAdmin }>("/products", payload));

    const products = getStoredDemoProducts();
    const name = payload.name.trim();
    const sku = payload.sku.trim();
    const stock = Number(payload.stock_quantity);
    if (!name || !sku || !PRICE_PATTERN.test(payload.price) || !Number.isInteger(stock) || stock < 0) {
      throw demoError("VALIDATION_ERROR", 422);
    }
    assertPrice(payload.price);
    if (products.some((product) => product.sku.toLowerCase() === sku.toLowerCase())) {
      throw demoError("DUPLICATE_SKU", 409);
    }

    const now = new Date().toISOString();
    const product: ProductAdmin = {
      id: makeDemoId("prod"),
      name,
      sku,
      description: payload.description?.trim() || null,
      category: payload.category?.trim() || null,
      price: payload.price,
      image_url: payload.image_url?.trim() || null,
      in_stock: stock > 0,
      stock_quantity: stock,
      is_active: payload.is_active ?? true,
      created_at: now,
      updated_at: now,
    };
    products.unshift(product);
    saveDemoProducts(products);
    if (product.category) saveDemoCategory(product.category);
    return product;
  },

  async update(id: string, payload: ProductUpdate): Promise<ProductAdmin> {
    if (!isDemoMode()) return unwrap(api.patch<{ data: ProductAdmin }>(`/products/${id}`, payload));

    const products = getStoredDemoProducts();
    const index = products.findIndex((product) => product.id === id);
    if (index === -1) throw demoError("PRODUCT_NOT_FOUND", 404);
    const existing = products[index] as ProductAdmin;

    const sku = payload.sku?.trim() ?? existing.sku;
    if (products.some((product) => product.id !== id && product.sku.toLowerCase() === sku.toLowerCase())) {
      throw demoError("DUPLICATE_SKU", 409);
    }
    if (payload.price !== undefined) assertPrice(payload.price);
    if (payload.name !== undefined && payload.name.trim() === "") throw demoError("VALIDATION_ERROR", 422);
    if (payload.stock_quantity !== undefined && (!Number.isInteger(payload.stock_quantity) || payload.stock_quantity < 0)) {
      throw demoError("VALIDATION_ERROR", 422);
    }

    const stock = payload.stock_quantity ?? existing.stock_quantity;
    const updated: ProductAdmin = {
      ...existing,
      name: payload.name?.trim() ?? existing.name,
      sku,
      description: payload.description !== undefined ? payload.description.trim() || null : existing.description,
      category: payload.category !== undefined ? payload.category.trim() || null : existing.category,
      price: payload.price ?? existing.price,
      image_url: payload.image_url !== undefined ? payload.image_url.trim() || null : existing.image_url,
      stock_quantity: stock,
      in_stock: stock > 0,
      is_active: payload.is_active ?? existing.is_active,
      updated_at: new Date().toISOString(),
    };
    products[index] = updated;
    saveDemoProducts(products);
    if (updated.category) saveDemoCategory(updated.category);
    return updated;
  },

  async remove(id: string): Promise<void> {
    if (!isDemoMode()) {
      // The backend returns 204 with no body; there is no envelope to unwrap.
      await api.delete(`/products/${id}`);
      return;
    }
    const products = getStoredDemoProducts();
    const index = products.findIndex((product) => product.id === id);
    if (index === -1) throw demoError("PRODUCT_NOT_FOUND", 404);
    const existing = products[index] as ProductAdmin;
    products[index] = { ...existing, is_active: false, in_stock: false, updated_at: new Date().toISOString() };
    saveDemoProducts(products);
  },
};
