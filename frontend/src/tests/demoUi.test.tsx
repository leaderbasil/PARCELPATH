import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MapLink } from "@/components/common/MapLink";
import { LoadingState } from "@/components/common/LoadingState";
import { Modal } from "@/components/common/Modal";
import { OrderRow } from "@/components/orders/OrderRow";
import { UI } from "@/constants/ui";
import type { OrderListItem } from "@/types/domain";
import { googleMapsSearchUrl } from "@/utils/googleMaps";

const order: OrderListItem = {
  id: "order-1",
  order_number: "PP-2026-0001",
  status: "OUT_FOR_DELIVERY",
  payment_method: "COD",
  payment_status: "UNPAID",
  total_amount: "20.50",
  items_count: 1,
  created_at: new Date().toISOString(),
  courier_phone: "0501234567",
};

describe("demo UI regressions", () => {
  it("opens order details without swallowing the courier phone link", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<OrderRow order={order} onOpen={onOpen} />);

    const phone = screen.getByRole("link", {
      name: `${UI.orders.callCourier} ${order.courier_phone}`,
    });
    expect(phone).toHaveAttribute("href", "tel:0501234567");
    await user.click(phone);
    expect(onOpen).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: UI.orders.details }));
    expect(onOpen).toHaveBeenCalledWith("order-1");
  });

  it("shows a WhatsApp courier link that matches the phone number", () => {
    render(<OrderRow order={order} onOpen={vi.fn()} />);
    const whatsapp = screen.getByRole("link", { name: new RegExp(UI.orders.whatsappCourier) });
    expect(whatsapp).toHaveAttribute("href", "https://wa.me/966501234567");
    expect(whatsapp).toHaveAttribute("target", "_blank");
    expect(whatsapp).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not show courier contact links before delivery", () => {
    render(<OrderRow order={{ ...order, status: "SHIPPED" }} onOpen={vi.fn()} />);
    expect(screen.queryByRole("link", { name: /اتصال بالموزع/ })).toBeNull();
    expect(screen.queryByRole("link", { name: new RegExp(UI.orders.whatsappCourier) })).toBeNull();
  });

  it("uses trusted stored map URLs and falls back safely", () => {
    const { rerender } = render(<MapLink query="الرياض" />);
    expect(screen.getByRole("link", { name: /عرض الموقع على الخريطة/ })).toHaveAttribute(
      "href",
      googleMapsSearchUrl("الرياض")
    );

    rerender(<MapLink url="https://maps.app.goo.gl/abc123" />);
    expect(screen.getByRole("link", { name: /عرض الموقع على الخريطة/ })).toHaveAttribute(
      "href",
      "https://maps.app.goo.gl/abc123"
    );

    rerender(<MapLink url="javascript:alert(1)" query="الرياض" />);
    expect(screen.getByRole("link", { name: /عرض الموقع على الخريطة/ })).toHaveAttribute(
      "href",
      googleMapsSearchUrl("الرياض")
    );
  });

  it("hides skeleton decoration from assistive technology", () => {
    render(<LoadingState variant="tracking" count={3} />);
    const status = screen.getByRole("status", { name: UI.common.loading });
    expect(status.querySelector("[aria-hidden='true'] ol")).toBeTruthy();
    expect(status.querySelector("button, a, input")).toBeNull();
  });

  it("keeps one scroll area inside the modal and locks the page behind it", () => {
    const view = render(
      <Modal open title="منتج جديد" onClose={vi.fn()}>
        <p>محتوى النموذج</p>
      </Modal>
    );

    expect(document.body.style.overflow).toBe("hidden");
    expect(document.querySelector(".modal-overlay")?.parentElement).toBe(document.body);
    expect(document.querySelector(".modal-overlay")).toHaveClass("overflow-hidden");
    expect(screen.getByRole("dialog")).toHaveClass("overflow-y-auto");

    view.unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
