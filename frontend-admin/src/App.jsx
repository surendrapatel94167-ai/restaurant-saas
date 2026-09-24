import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Login from './pages/Login';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import MenuPage from './pages/menu/MenuPage';
import KdsPage from './pages/kds/KdsPage';
import HrPage from './pages/hr/HrPage';
import FinancePage from './pages/finance/FinancePage';
import ReviewsPage from './pages/reviews/ReviewsPage';
import CouponsPage from './pages/coupons/CouponsPage';
import ProfilePage from './pages/profile/ProfilePage';
import MyProfilePage from './pages/profile/MyProfilePage';
import StaffAttendancePage from './pages/attendance/StaffAttendancePage';
import TablesPage from './pages/tables/TablesPage';
import BillingPage from './pages/billing/BillingPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import LiveOrdersPage from './pages/live-orders/LiveOrdersPage';
import CustomersPage from './pages/customers/CustomersPage';
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import AddHotelPage from './pages/super-admin/AddHotelPage';
import AddMultiBranchHotelPage from './pages/super-admin/AddMultiBranchHotelPage';
import AllHotelsPage from './pages/super-admin/AllHotelsPage';
import MessagesPage from './pages/super-admin/MessagesPage';
import PlatformSettingsPage from './pages/super-admin/PlatformSettingsPage';

// super_admin isn't tied to any one restaurant (no tenantId), so it must land
// on /super-admin, never on a tenant-scoped page like /kds. Admin/manager land
// on Live Orders (where new orders need accepting); kitchen staff land on KDS.
function HomeRedirect() {
  const { user } = useSelector((s) => s.auth);
  if (user?.role === 'super_admin') return <Navigate to="/super-admin" replace />;
  if (['hotel_admin', 'manager'].includes(user?.role)) return <Navigate to="/live-orders" replace />;
  return <Navigate to="/kds" replace />;
}

export default function App() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/kds" element={<KdsPage />} />
        <Route path="/attendance" element={<StaffAttendancePage />} />
        <Route path="/my-profile" element={<MyProfilePage />} />

        <Route element={<ProtectedRoute allowedRoles={['hotel_admin', 'manager']} />}>
          <Route path="/live-orders" element={<LiveOrdersPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/coupons" element={<CouponsPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/hr" element={<HrPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/tables" element={<TablesPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
          <Route path="/super-admin" element={<SuperAdminDashboard />} />
          <Route path="/super-admin/add-hotel" element={<AddHotelPage />} />
          <Route path="/super-admin/add-multi-branch" element={<AddMultiBranchHotelPage />} />
          <Route path="/super-admin/hotels" element={<AllHotelsPage />} />
          <Route path="/super-admin/messages" element={<MessagesPage />} />
          <Route path="/super-admin/platform-settings" element={<PlatformSettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
