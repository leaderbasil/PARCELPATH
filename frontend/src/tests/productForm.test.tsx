import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProductForm } from "@/pages/admin/ProductForm";
import { UI } from "@/constants/ui";
import { DEMO_TOKEN } from "@/services/demoMode";

import { API_BASE, adminUser, isRecord } from "./handlers";
import { server } from "./server";
import { findField, renderWithProviders, seedSession } from "./utils";

vi.mock("@/services/objectStorage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/objectStorage")>();
  return {
    ...actual,
    putImage: vi.fn(() => Promise.resolve("object:test-image")),
    getObjectUrl: vi.fn(() => Promise.resolve("blob:preview")),
  };
});

let capturedBody: unknown = null;

beforeEach(() => {
  capturedBody = null;
  seedSession(adminUser, "test-token-admin");
  server.use(
    http.post(`${API_BASE}/products`, async ({ request }) => {
      capturedBody = await request.json();
      return HttpResponse.json(
        {
          data: {
            id: "new-product",
            name: "منتج جديد",
            sku: "NEW-1",
            category: "Home",
            price: "10.00",
            is_active: true,
            in_stock: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          message: "created",
        },
        { status: 201 }
      );
    })
  );
});

describe("admin product form", () => {
  it("uses a category dropdown and stores uploaded images by object reference", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProductForm open onClose={vi.fn()} />, { route: "/admin/products" });

    const category = screen.getByLabelText(UI.catalog.categories);
    expect(category.tagName).toBe("SELECT");
    expect(screen.queryByRole("textbox", { name: UI.catalog.categories })).toBeNull();

    await user.type(findField("الاسم"), "منتج جديد");
    await user.type(findField("رمز المنتج"), "NEW-1");
    await user.type(findField("السعر"), "10.00");
    await user.type(findField(UI.admin.stock), "4");
    await user.selectOptions(category, "Home");

    const file = new File(["image"], "photo.png", { type: "image/png" });
    await user.upload(screen.getByLabelText(UI.admin.attachImage), file);
    await waitFor(() =>
      expect(document.querySelector('input[type="hidden"]')).toHaveValue("object:test-image")
    );

    await user.click(screen.getByRole("button", { name: UI.common.save }));

    await waitFor(() => expect(capturedBody).not.toBeNull());
    if (!isRecord(capturedBody)) throw new Error("Captured body is malformed");
    expect(capturedBody["category"]).toBe("Home");
    expect(capturedBody["image_url"]).toBe("object:test-image");
  });

  it("accepts a category typed into the new-category field", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProductForm open onClose={vi.fn()} />, { route: "/admin/products" });

    const category = screen.getByLabelText(UI.catalog.categories);
    await user.selectOptions(
      category,
      screen.getByRole("option", { name: UI.admin.newCategory })
    );
    await user.type(findField(UI.admin.newCategoryName), "خضروات");
    await user.type(findField("الاسم"), "منتج جديد");
    await user.type(findField("رمز المنتج"), "NEW-2");
    await user.type(findField("السعر"), "10.00");
    await user.type(findField(UI.admin.stock), "4");
    await user.click(screen.getByRole("button", { name: UI.common.save }));

    await waitFor(() => expect(capturedBody).not.toBeNull());
    if (!isRecord(capturedBody)) throw new Error("Captured body is malformed");
    expect(capturedBody["category"]).toBe("خضروات");
  });

  it("persists a new category in the browser-only demo", async () => {
    const user = userEvent.setup();
    localStorage.removeItem("parcelpath.demo.v4.categories");
    localStorage.removeItem("parcelpath.demo.v4.products");
    seedSession(adminUser, DEMO_TOKEN);
    renderWithProviders(<ProductForm open onClose={vi.fn()} />, { route: "/admin/products" });

    const category = screen.getByLabelText(UI.catalog.categories);
    await user.selectOptions(category, screen.getByRole("option", { name: UI.admin.newCategory }));
    await user.type(findField(UI.admin.newCategoryName), "خضروات");
    await user.type(findField("الاسم"), "منتج تجريبي");
    await user.type(findField("رمز المنتج"), "NEW-DEMO-1");
    await user.type(findField("السعر"), "5.00");
    await user.type(findField(UI.admin.stock), "1");
    await user.click(screen.getByRole("button", { name: UI.common.save }));

    await waitFor(() => {
      const stored: unknown = JSON.parse(
        localStorage.getItem("parcelpath.demo.v4.categories") ?? "[]"
      );
      expect(stored).toContain("خضروات");
    });
  });
});
