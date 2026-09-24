import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const cart = useSelector((s) => s.cart.items);
  const [activeOrderId, setActiveOrderId] = useState(() => localStorage.getItem('activeOrderId'));

  // BottomNav sits outside <Routes>, so useParams() has no matched-route
  // context to read from — parse tenantSlug/tableId straight from the path.
  const match = location.pathname.match(/^\/menu\/([^/]+)\/([^/]+)/);
  const tenantSlug = match?.[1];
  const tableId = match?.[2];

  // Pick up a newly-placed order (or a cleared one) without needing a reload —
  // storage events fire across tabs; same-tab writes are read on route change.
  useEffect(() => {
    setActiveOrderId(localStorage.getItem('activeOrderId'));
  }, [location.pathname]);

  if (!tenantSlug || !tableId) return null;

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const base = `/menu/${tenantSlug}/${tableId}`;

  const items = [
    { key: 'home', icon: '🏠', label: 'Home', onClick: () => navigate(base), active: location.pathname === base },
    { key: 'menu', icon: '🍽️', label: 'Menu', onClick: () => navigate(`${base}/items`), active: location.pathname.startsWith(`${base}/items`) || location.pathname.includes('/dish/') },
    {
      key: 'cart', icon: '🛒', label: 'Cart', badge: totalItems || null,
      onClick: () => navigate(`${base}/cart`), active: location.pathname.startsWith(`${base}/cart`),
    },
    {
      key: 'order', icon: '🧾', label: 'My Order',
      onClick: () => activeOrderId && navigate(`${base}/track/${activeOrderId}`),
      active: location.pathname.includes('/track/'),
      disabled: !activeOrderId,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex max-w-lg mx-auto"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      {items.map((it) => (
        <button
          key={it.key}
          onClick={it.onClick}
          disabled={it.disabled}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 relative ${
            it.disabled ? 'opacity-35' : it.active ? 'text-brand-600' : 'text-gray-500'
          }`}
        >
          <span className="text-xl leading-none relative">
            {it.icon}
            {it.badge ? (
              <span className="absolute -top-1.5 -right-2.5 bg-brand-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {it.badge}
              </span>
            ) : null}
          </span>
          <span className="text-[10px] font-medium leading-none">{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
