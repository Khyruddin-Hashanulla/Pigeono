import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import Search from "./pages/Search";
import PigeonDetail from "./pages/PigeonDetail";
import Storefront from "./pages/Storefront";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import BecomeVendor from "./pages/BecomeVendor";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import OrderReceipt from "./pages/OrderReceipt";
import Messages from "./pages/Messages";
import AdminPanel from "./pages/admin/AdminPanel";
import VendorSales from "./pages/vendor/VendorSales";
import VendorListings from "./pages/vendor/VendorListings";
import VendorListingForm from "./pages/vendor/VendorListingForm";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Wishlist from "./pages/account/Wishlist";
import Cart from "./pages/account/Cart";
import Addresses from "./pages/account/Addresses";
import Notifications from "./pages/account/Notifications";
import Profile from "./pages/account/Profile";
import VendorSubscription from "./pages/vendor/VendorSubscription";
import VendorAnalytics from "./pages/vendor/VendorAnalytics";
import VendorShopSettings from "./pages/vendor/VendorShopSettings";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/pigeons/:id" element={<PigeonDetail />} />
            <Route path="/store/:storeSlug" element={<Storefront />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/become-vendor"
              element={
                <ProtectedRoute>
                  <BecomeVendor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout/:id"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <Checkout />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/orders"
              element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/orders/:id/receipt"
              element={
                <ProtectedRoute>
                  <OrderReceipt />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/wishlist"
              element={
                <ProtectedRoute>
                  <Wishlist />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/cart"
              element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/addresses"
              element={
                <ProtectedRoute>
                  <Addresses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/messages"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <Messages />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/messages/:conversationId"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <Messages />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <ErrorBoundary>
                    <AdminPanel />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/vendor/sales"
              element={
                <ProtectedRoute requireVendor>
                  <ErrorBoundary>
                    <VendorSales />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/vendor"
              element={
                <ProtectedRoute requireVendor>
                  <ErrorBoundary>
                    <VendorListings />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/vendor/subscription"
              element={
                <ProtectedRoute requireVendor>
                  <VendorSubscription />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/vendor/analytics"
              element={
                <ProtectedRoute requireVendor>
                  <VendorAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/vendor/settings"
              element={
                <ProtectedRoute requireVendor>
                  <VendorShopSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/vendor/listings/new"
              element={
                <ProtectedRoute requireVendor>
                  <VendorListingForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/vendor/listings/:id/edit"
              element={
                <ProtectedRoute requireVendor>
                  <VendorListingForm />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
