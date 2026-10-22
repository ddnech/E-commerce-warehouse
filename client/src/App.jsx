import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import { Toaster } from "sonner";
import { ShopProvider, RequireUser } from "./auth/ShopContext";
import { AdminProvider, RequireAdmin } from "./auth/AdminContext";
import ShopLayout from "./components/shop/ShopLayout";
import Home from "./pages/shop/Home";
import Shop from "./pages/shop/Shop";
import ProductDetail from "./pages/shop/ProductDetail";
import Cart from "./pages/shop/Cart";
import NotFound from "./pages/NotFound";

// Everything below the shop's front door loads on demand, so the first page is light.
const Checkout = lazy(() => import("./pages/shop/Checkout"));
const Stores = lazy(() => import("./pages/shop/Stores"));
const About = lazy(() => import("./pages/shop/About"));
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const Verify = lazy(() => import("./pages/auth/Verify"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const AccountLayout = lazy(() => import("./pages/account/AccountLayout"));
const Profile = lazy(() => import("./pages/account/Profile"));
const Addresses = lazy(() => import("./pages/account/Addresses"));
const Orders = lazy(() => import("./pages/account/Orders"));
const OrderDetail = lazy(() => import("./pages/account/OrderDetail"));
const Wishlist = lazy(() => import("./pages/account/Wishlist"));

const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminLogin = lazy(() => import("./pages/admin/Login"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const SalesReport = lazy(() => import("./pages/admin/SalesReport"));
const Products = lazy(() => import("./pages/admin/Products"));
const Categories = lazy(() => import("./pages/admin/Categories"));
const Stock = lazy(() => import("./pages/admin/Stock"));
const Transfers = lazy(() => import("./pages/admin/Transfers"));
const StockHistory = lazy(() => import("./pages/admin/StockHistory"));
const Warehouses = lazy(() => import("./pages/admin/Warehouses"));
const Admins = lazy(() => import("./pages/admin/Admins"));
const Customers = lazy(() => import("./pages/admin/Customers"));

function Loading() {
  return <div className="flex min-h-[50vh] items-center justify-center text-sm text-ink-soft">Loading…</div>;
}

export default function App() {
  return (
    <ShopProvider>
      <AdminProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route element={<ShopLayout />}>
              <Route index element={<Home />} />
              <Route path="shop" element={<Shop />} />
              <Route path="products/:id" element={<ProductDetail />} />
              <Route path="cart" element={<Cart />} />
              <Route path="stores" element={<Stores />} />
              <Route path="about" element={<About />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="verify/:token" element={<Verify />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="reset-password/:token" element={<ResetPassword />} />
              <Route path="checkout" element={<RequireUser><Checkout /></RequireUser>} />
              <Route path="account" element={<RequireUser><AccountLayout /></RequireUser>}>
                <Route index element={<Profile />} />
                <Route path="orders" element={<Orders />} />
                <Route path="orders/:invoice" element={<OrderDetail />} />
                <Route path="addresses" element={<Addresses />} />
                <Route path="wishlist" element={<Wishlist />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>

            <Route path="admin/login" element={<AdminLogin />} />
            <Route path="admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="reports" element={<SalesReport />} />
              <Route path="products" element={<Products />} />
              <Route path="categories" element={<Categories />} />
              <Route path="stock" element={<Stock />} />
              <Route path="transfers" element={<Transfers />} />
              <Route path="stock-history" element={<StockHistory />} />
              <Route path="warehouses" element={<Warehouses />} />
              <Route path="admins" element={<RequireAdmin superOnly><Admins /></RequireAdmin>} />
              <Route path="customers" element={<Customers />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
        <Toaster position="top-center" richColors closeButton toastOptions={{ style: { fontFamily: "var(--font-sans)" } }} />
      </AdminProvider>
    </ShopProvider>
  );
}
