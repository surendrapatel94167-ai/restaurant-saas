import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout, setCredentials } from '../features/authSlice';
import api from '../api/axios';
import { useConfirm } from '../components/ConfirmProvider';
import {
  LayoutDashboard, PlusCircle, Building2, Building, Mail, Settings, UserCog,
  Bell, BarChart3, Flame, UtensilsCrossed, Star, Ticket, Smartphone, Users,
  Wallet, QrCode, CreditCard, Store, Clock, Menu as MenuIcon, LogOut, ChevronDown,
} from 'lucide-react';

const NAV_BY_ROLE = {
  super_admin: [
    { to: '/super-admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/super-admin/add-hotel', label: 'Add Hotel', icon: PlusCircle },
    { to: '/super-admin/add-multi-branch', label: 'Add Multi-Branch', icon: Building2 },
    { to: '/super-admin/hotels', label: 'All Hotels', icon: Building },
    { to: '/super-admin/messages', label: 'Messages', icon: Mail },
    { to: '/super-admin/platform-settings', label: 'Platform Settings', icon: Settings },
    { to: '/my-profile', label: 'My Profile', icon: UserCog },
  ],
  hotel_admin: [
    { to: '/live-orders', label: 'Live Orders', icon: Bell },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/kds', label: 'Kitchen Display', icon: Flame },
    { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
    { to: '/reviews', label: 'Reviews', icon: Star },
    { to: '/coupons', label: 'Coupons', icon: Ticket },
    { to: '/customers', label: 'Customers', icon: Smartphone },
    { to: '/hr', label: 'HR', icon: Users },
    { to: '/finance', label: 'Finance', icon: Wallet },
    { to: '/tables', label: 'Tables & QR', icon: QrCode },
    { to: '/billing', label: 'Subscription', icon: CreditCard },
    { to: '/profile', label: 'Restaurant Profile', icon: Store },
    { to: '/my-profile', label: 'My Profile', icon: UserCog },
  ],
  manager: [
    { to: '/live-orders', label: 'Live Orders', icon: Bell },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/kds', label: 'Kitchen Display', icon: Flame },
    { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
    { to: '/reviews', label: 'Reviews', icon: Star },
    { to: '/coupons', label: 'Coupons', icon: Ticket },
    { to: '/customers', label: 'Customers', icon: Smartphone },
    { to: '/hr', label: 'HR', icon: Users },
    { to: '/finance', label: 'Finance', icon: Wallet },
    { to: '/tables', label: 'Tables & QR', icon: QrCode },
    { to: '/billing', label: 'Subscription', icon: CreditCard },
    { to: '/my-profile', label: 'My Profile', icon: UserCog },
  ],
  chef: [
    { to: '/kds', label: 'Kitchen Display / Live Orders', icon: Flame },
    { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
    { to: '/attendance', label: 'Attendance', icon: Clock },
    { to: '/my-profile', label: 'My Profile', icon: UserCog },
  ],
  waiter: [
    { to: '/kds', label: 'Kitchen Display / Live Orders', icon: Flame },
    { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
    { to: '/attendance', label: 'Attendance', icon: Clock },
    { to: '/my-profile', label: 'My Profile', icon: UserCog },
  ],
  cashier: [
    { to: '/kds', label: 'Kitchen Display / Live Orders', icon: Flame },
    { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
    { to: '/attendance', label: 'Attendance', icon: Clock },
    { to: '/my-profile', label: 'My Profile', icon: UserCog },
  ],
};

function Avatar({ src, name, size = 'w-8 h-8', textSize = 'text-xs' }) {
  if (src) {
    return <img src={src} alt={name} className={`${size} rounded-full object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`${size} rounded-full bg-brand-500/20 text-brand-300 flex items-center justify-center ${textSize} font-bold flex-shrink-0`}>
      {name?.[0]?.toUpperCase()}
    </div>
  );
}

function SidebarContent({ nav, user, branches, switchBranch, notifications, showNotifs, setShowNotifs, unread, markRead, onNavigate }) {
  return (
    <>
      <div className="p-5 flex items-center gap-2.5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0">R</div>
        <span className="text-white font-semibold text-sm tracking-wide truncate">Restaurant SaaS</span>
        {(user?.role === 'hotel_admin' || user?.role === 'manager') && (
          <button onClick={() => setShowNotifs((v) => !v)} className="ml-auto relative hover:scale-110 transition flex-shrink-0 text-gray-300" aria-label="Notifications">
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>
        )}
      </div>

      {showNotifs && (
        <div className="max-h-56 overflow-y-auto border-b border-white/10 p-2 space-y-1.5">
          {notifications.length === 0 && <p className="text-xs text-gray-500 px-2">No notifications.</p>}
          {notifications.map((n) => (
            <button key={n._id} onClick={() => markRead(n._id)}
              className={`block w-full text-left text-xs px-2 py-1.5 rounded-lg ${n.isRead ? 'text-gray-500' : 'bg-white/5 text-gray-100'}`}>
              {n.message}
            </button>
          ))}
        </div>
      )}

      {branches.length > 1 && (
        <div className="px-3 pt-3">
          <label className="text-[10px] uppercase tracking-wide text-gray-500 px-1">Branch</label>
          <select
            value={user?.tenantId}
            onChange={(e) => switchBranch(e.target.value)}
            className="w-full mt-1 bg-white/5 border border-white/10 text-gray-100 text-sm rounded-lg px-2 py-1.5 outline-none"
          >
            {branches.map((b) => (
              <option key={b._id} value={b._id} className="text-ink-900">{b.hotelName}</option>
            ))}
          </select>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive
                  ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-900/30'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <item.icon size={17} className="flex-shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export default function AdminLayout() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm } = useConfirm();
  const nav = NAV_BY_ROLE[user?.role] || [];
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [branches, setBranches] = useState([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    if (user?.role === 'hotel_admin' || user?.role === 'manager') {
      api.get('/notifications').then(({ data }) => setNotifications(data)).catch(() => {});
      api.get('/auth/my-branches').then(({ data }) => setBranches(data)).catch(() => {});
    }
    api.get('/auth/my-profile').then(({ data }) => setProfileImageUrl(data.profileImageUrl || null)).catch(() => {});
  }, [user?.role]);

  useEffect(() => { setMobileNavOpen(false); setShowProfileMenu(false); }, [location.pathname]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) setShowProfileMenu(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const switchBranch = async (tenantId) => {
    if (tenantId === user?.tenantId) return;
    const { data } = await api.post('/auth/switch-branch', { tenantId });
    dispatch(setCredentials(data));
    navigate('/');
    window.location.reload(); // simplest way to refetch every tenant-scoped page cleanly
  };

  const unread = notifications.filter((n) => !n.isRead).length;

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
  };

  const handleLogout = async () => {
    const ok = await confirm({ title: 'Log out?', message: 'You\u2019ll need to sign in again to access the panel.' });
    if (!ok) return;
    dispatch(logout());
    navigate('/login');
  };

  const currentLabel = nav.find((item) => item.end ? location.pathname === item.to : location.pathname.startsWith(item.to))?.label || '';

  const sidebarProps = { nav, user, branches, switchBranch, notifications, showNotifs, setShowNotifs, unread, markRead };

  return (
    <div className="min-h-screen flex bg-[#f7f5f2]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:sticky md:top-0 md:h-screen w-64 bg-gradient-to-b from-ink-950 to-[#171426] text-gray-300 flex-col shadow-2xl flex-shrink-0">
        <SidebarContent {...sidebarProps} />
        <div className="p-4 border-t border-white/10 text-sm">
          <div className="flex items-center gap-2 text-gray-200">
            <Avatar src={profileImageUrl} name={user?.name} />
            <div className="min-w-0">
              <p className="truncate">{user?.name}</p>
              <span className="block text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile slide-in drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative w-72 max-w-[80vw] bg-gradient-to-b from-ink-950 to-[#171426] text-gray-300 flex flex-col shadow-2xl h-full">
            <SidebarContent {...sidebarProps} onNavigate={() => setMobileNavOpen(false)} />
            <div className="p-4 border-t border-white/10 text-sm">
              <div className="flex items-center gap-2 text-gray-200">
                <Avatar src={profileImageUrl} name={user?.name} />
                <div className="min-w-0">
                  <p className="truncate">{user?.name}</p>
                  <span className="block text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top header — always visible, carries the mobile menu button + profile dropdown */}
        <header className="sticky top-0 z-30 bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm" style={{ paddingTop: 'calc(0.75rem + var(--safe-top, 0px))' }}>
          <button
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-ink-900 flex-shrink-0"
            aria-label="Open menu"
          >
            <MenuIcon size={20} />
          </button>
          <h1 className="font-semibold text-ink-900 truncate">{currentLabel}</h1>
          <div className="ml-auto flex items-center gap-3">
            {branches.length > 1 && (
              <span className="hidden sm:inline text-xs text-gray-400">
                {branches.find((b) => b._id === user?.tenantId)?.hotelName}
              </span>
            )}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu((v) => !v)}
                className="flex items-center gap-1.5 rounded-full hover:bg-gray-100 pl-0.5 pr-1.5 py-0.5 transition"
              >
                <Avatar src={profileImageUrl} name={user?.name} size="w-8 h-8" />
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 z-50 animate-toast-in">
                  <div className="px-3.5 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-ink-900 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
                  </div>
                  <NavLink
                    to="/my-profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <UserCog size={16} /> My Profile
                  </NavLink>
                  <button
                    onClick={() => { setShowProfileMenu(false); handleLogout(); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-500 hover:bg-red-50"
                  >
                    <LogOut size={16} /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
