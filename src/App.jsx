import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollManager from './components/ScrollManager';
import BrandLoader from './components/BrandLoader';
import { GuestOnly, RequireAdmin, RequireAuth } from './components/RouteGuards';
import { ProductsProvider } from './context/ProductsProvider';
import { CartProvider } from './context/CartProvider';
import { useAuth } from './context/auth';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MobileLoginPage from './pages/MobileLoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import LegalPage from './pages/LegalPage';
import ProfilePage from './pages/ProfilePage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';
import CheckoutCancelPage from './pages/CheckoutCancelPage';
import NotFoundPage from './pages/NotFoundPage';
import AccountLayout from './layouts/AccountLayout';
import AdminLayout from './admin/AdminLayout';
import AdminLoginPage from './admin/AdminLoginPage';
import AdminDashboard from './admin/pages/AdminDashboard';
import AdminOrders from './admin/pages/AdminOrders';
import AdminProducts from './admin/pages/AdminProducts';
import AdminCustomers from './admin/pages/AdminCustomers';
import AdminInventory from './admin/pages/AdminInventory';
import AdminPayments from './admin/pages/AdminPayments';
import AdminReports from './admin/pages/AdminReports';
import AdminHero from './admin/pages/AdminHero';
import AdminSettings from './admin/pages/AdminSettings';
import './index.css';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <div className="route-view" key={location.pathname}>
      <Routes location={location}>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/login"
          element={
            <GuestOnly>
              <LoginPage />
            </GuestOnly>
          }
        />
        <Route
          path="/mobile-login"
          element={
            <GuestOnly>
              <MobileLoginPage />
            </GuestOnly>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnly>
              <RegisterPage />
            </GuestOnly>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <GuestOnly>
              <ForgotPasswordPage />
            </GuestOnly>
          }
        />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        <Route path="/terms" element={<LegalPage kind="terms" />} />
        <Route path="/privacy" element={<LegalPage kind="privacy" />} />

        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />

        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<AdminProducts createMode />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="hero" element={<AdminHero />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>

        <Route
          path="/account"
          element={
            <RequireAuth>
              <AccountLayout />
            </RequireAuth>
          }
        >
          <Route index element={<ProfilePage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

function App() {
  const { status } = useAuth();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Initial splash while the persisted session is resolved. Real state only.
  if (status === 'loading') {
    return <BrandLoader label="Loading JH Soap" />;
  }

  if (isAdminRoute) {
    return <AnimatedRoutes />;
  }

  return (
    <ProductsProvider>
      <CartProvider>
        <ScrollManager />
        <Navbar />
        <AnimatedRoutes />
        <Footer />
      </CartProvider>
    </ProductsProvider>
  );
}

export default App;
