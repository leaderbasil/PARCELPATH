import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { getErrorMessage } from "@/constants/messages";
import { UI } from "@/constants/ui";
import Login from "@/pages/auth/Login";

import { adminUser, customerUser } from "./handlers";
import { findField, LocationDisplay, renderWithProviders } from "./utils";

function renderLogin(route: string | { pathname: string; state?: unknown } = "/login") {
  return renderWithProviders(
    <>
      <LocationDisplay />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<p>ADMIN HOME</p>} />
        <Route path="/orders" element={<p>CUSTOMER ORDERS</p>} />
        <Route path="/403" element={<p>FORBIDDEN</p>} />
        <Route path="*" element={<p>NOT FOUND</p>} />
      </Routes>
    </>,
    { route }
  );
}

async function submit(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole("button", { name: UI.nav.login }));
}

describe("login flow", () => {
  it("stores the token and user, then routes an ADMIN to /admin", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(findField(UI.auth.email), adminUser.email);
    await user.type(findField(UI.auth.password), "Admin123!");
    await submit(user);

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/admin");
    });
    expect(sessionStorage.getItem("access_token")).toBe("test-token-admin");

    const storedUser: unknown = JSON.parse(sessionStorage.getItem("user") ?? "null");
    expect(storedUser).toMatchObject({ id: adminUser.id, role: "ADMIN" });
  });

  it("shows the Arabic INVALID_CREDENTIALS message and stays on /login", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(findField(UI.auth.email), customerUser.email);
    await user.type(findField(UI.auth.password), "wrong-password");
    await submit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      getErrorMessage("INVALID_CREDENTIALS")
    );
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
    expect(sessionStorage.getItem("access_token")).toBeNull();
  });

  it("returns to the protected location captured in state.from", async () => {
    const user = userEvent.setup();
    renderLogin({ pathname: "/login", state: { from: "/orders" } });

    await user.type(findField(UI.auth.email), customerUser.email);
    await user.type(findField(UI.auth.password), "Customer123!");
    await submit(user);

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/orders");
    });
    expect(sessionStorage.getItem("access_token")).toBe("test-token-customer");
  });
});
