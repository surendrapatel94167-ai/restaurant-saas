import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import MenuPage from './pages/MenuPage';
import DishDetailPage from './pages/DishDetailPage';
import ContactPage from './pages/ContactPage';
import ReviewPage from './pages/ReviewPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import BottomNav from './components/BottomNav';
import NoRestaurantPage from './pages/NoRestaurantPage';
import { setManifestForTenant } from './utils/pwaManifest';

// PWA install icon reopens at /menu/:tenantSlug with no table — land on that
// restaurant's own landing page rather than the generic fallback.
function TenantOnlyRedirect() {
  const { tenantSlug } = useParams();
  return <Navigate to={`/menu/${tenantSlug}/no-table`} replace />;
}

// Keeps the installable manifest pointed at whichever restaurant the guest
// is currently on (see utils/pwaManifest.js for why this is per-tenant).
function ManifestSync() {
  const location = useLocation();
  useEffect(() => {
    const match = location.pathname.match(/^\/menu\/([^/]+)/);
    if (match) setManifestForTenant(match[1]);
  }, [location.pathname]);
  return null;
}

export default function App() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <>
      <ManifestSync />
      <Routes>
        <Route path="/menu/:tenantSlug" element={<TenantOnlyRedirect />} />
        <Route path="/menu/:tenantSlug/:tableId" element={<LandingPage />} />
        <Route path="/menu/:tenantSlug/:tableId/items" element={<MenuPage />} />
        <Route path="/menu/:tenantSlug/:tableId/dish/:dishId" element={<DishDetailPage />} />
        <Route path="/menu/:tenantSlug/:tableId/contact" element={<ContactPage />} />
        <Route path="/menu/:tenantSlug/:tableId/review" element={<ReviewPage />} />
        <Route path="/menu/:tenantSlug/:tableId/cart" element={<CartPage />} />
        <Route path="/menu/:tenantSlug/:tableId/checkout" element={<CheckoutPage />} />
        <Route path="/menu/:tenantSlug/:tableId/track/:orderId" element={<OrderTrackingPage />} />
        <Route path="*" element={<NoRestaurantPage />} />
      </Routes>
      <BottomNav />
    </>
  );
}
