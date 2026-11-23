import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { ThemeProvider } from "@/context/ThemeContext";
import { LoadingState } from "@/components/common/LoadingState";
import { ProtectedRoute } from "@/routes/ProtectedRoute";

const Login = lazy(() => import("@/pages/auth/Login"));
const Register = lazy(() => import("@/pages/auth/Register"));
const Catalog = lazy(() => import("@/pages/catalog/Catalog"));
const ProductDetails = lazy(() => import("@/pages/catalog/ProductDetails"));
const Cart = lazy(() => import("@/pages/cart/Cart"));
const Checkout = lazy(() => import("@/pages/checkout/Checkout"));
const MyOrders = lazy(() => import("@/pages/my-orders/MyOrders"));
const OrderDetails = lazy(() => import("@/pages/my-orders/OrderDetails"));

const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminOrders = lazy(() => import("@/pages/admin/Orders"));
const AdminOrderDetails = lazy(() => import("@/pages/admin/AdminOrderDetails"));
const AdminProducts = lazy(() => import("@/pages/admin/Products"));
const AdminUsers = lazy(() => import("@/pages/admin/Users"));

const Forbidden = lazy(() => import("@/pages/Forbidden"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <CartProvider>
              <Suspense fallback={<LoadingState />}>
                <Routes>
                  <Route element={<AppShell />}>
                    <Route index element={<Catalog />} />
                    <Route path="products/:id" element={<ProductDetails />} />
                    <Route path="cart" element={<Cart />} />
                    <Route path="login" element={<Login />} />
                    <Route path="register" element={<Register />} />
                    <Route path="403" element={<Forbidden />} />

                    <Route
                      path="checkout"
                      element={
                        <ProtectedRoute roles={["CUSTOMER"]}>
                          <Checkout />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="orders"
                      element={
                        <ProtectedRoute roles={["CUSTOMER"]}>
                          <MyOrders />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="orders/:id"
                      element={
                        <ProtectedRoute roles={["CUSTOMER"]}>
                          <OrderDetails />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="admin"
                      element={
                        <ProtectedRoute roles={["ADMIN"]}>
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="admin/orders"
                      element={
                        <ProtectedRoute roles={["ADMIN"]}>
                          <AdminOrders />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="admin/orders/:id"
                      element={
                        <ProtectedRoute roles={["ADMIN"]}>
                          <AdminOrderDetails />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="admin/products"
                      element={
                        <ProtectedRoute roles={["ADMIN"]}>
                          <AdminProducts />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="admin/users"
                      element={
                        <ProtectedRoute roles={["ADMIN"]}>
                          <AdminUsers />
                        </ProtectedRoute>
                      }
                    />

                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </Suspense>
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
