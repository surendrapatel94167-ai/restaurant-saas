import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import api from '../api/axios';
import { addItem } from '../features/cartSlice';
import InstallAppButton from '../components/InstallAppButton';

export default function LandingPage() {
  const { tenantSlug, tableId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [info, setInfo] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [reordering, setReordering] = useState(false);
  const [visits, setVisits] = useState(null);

  useEffect(() => {
    api.get(`/customer/${tenantSlug}/landing`)
      .then(({ data }) => setInfo(data))
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true);
        else setInfo({});
      });

    const phone = localStorage.getItem('customerPhone');
    if (phone) {
      api.get(`/customer/${tenantSlug}/last-order`, { params: { phone } })
        .then(({ data }) => { if (data?.items?.length) setLastOrder(data); })
        .catch(() => {});
      api.get(`/customer/${tenantSlug}/visits`, { params: { phone } })
        .then(({ data }) => { if (data.isReturning) setVisits(data); })
        .catch(() => {});
    }
  }, [tenantSlug]);

  const reorder = async () => {
    setReordering(true);
    try {
      const { data: menu } = await api.get(`/customer/${tenantSlug}/menu`);
      const menuById = new Map(menu.items.map((m) => [m._id, m]));
      lastOrder.items.forEach((it) => {
        const menuItem = menuById.get(it.menuItemId);
        if (!menuItem) return;
        const finalPrice = menuItem.discount?.isActive && menuItem.discount.percentage > 0
          ? Math.round(menuItem.price * (1 - menuItem.discount.percentage / 100))
          : menuItem.price;
        for (let i = 0; i < it.quantity; i++) {
          dispatch(addItem({ menuItemId: it.menuItemId, name: menuItem.name?.en, price: finalPrice }));
        }
      });
      navigate(`/menu/${tenantSlug}/${tableId}/cart`);
    } finally {
      setReordering(false);
    }
  };

  const buttons = [
    {
      label: 'Menu',
      icon: '🍽️',
      onClick: () => navigate(`/menu/${tenantSlug}/${tableId}/items`),
    },
    {
      label: 'Contact',
      icon: '📞',
      onClick: () => navigate(`/menu/${tenantSlug}/${tableId}/contact`),
    },
    {
      label: 'Review',
      icon: '⭐',
      onClick: () => navigate(`/menu/${tenantSlug}/${tableId}/review`),
    },
    {
      label: 'Instagram',
      icon: '📸',
      onClick: () => {
        if (info?.instagramUrl) window.open(info.instagramUrl, '_blank', 'noopener,noreferrer');
      },
      disabled: !info?.instagramUrl,
    },
  ];

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#fbf7f4] flex flex-col items-center justify-center px-6 pb-20 text-center">
        <span className="text-5xl mb-4">🔍</span>
        <h1 className="text-xl font-bold text-ink-900">Restaurant not found</h1>
        <p className="text-gray-500 mt-2 text-sm max-w-xs">
          This QR code or link doesn't match any restaurant. Please rescan the table QR code, or check the link with the restaurant.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf7f4] flex flex-col items-center justify-center px-6 pb-20">
      <div className="w-full max-w-sm text-center">
        {info?.logoUrl ? (
          <img src={info.logoUrl} alt={info.hotelName} className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4 shadow-card" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-ink-950 to-brand-700 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-card">
            {info?.hotelName?.[0] || 'R'}
          </div>
        )}
        <h1 className="text-2xl font-bold text-ink-900">{info?.hotelName || 'Welcome'}</h1>
        {tableId && tableId !== 'no-table' && (
          <p className="text-sm text-gray-500 mt-1">Table {tableId.slice(-4)} · Scan-to-order</p>
        )}

        {visits && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-800">
            👋 Welcome back! This is your <strong>visit #{visits.totalOrders}</strong>.
            {visits.visitsUntilNextMilestone > 0 && (
              <span className="block text-xs mt-0.5">
                {visits.visitsUntilNextMilestone} more visit{visits.visitsUntilNextMilestone === 1 ? '' : 's'} until your next reward 🎁
              </span>
            )}
          </div>
        )}

        {lastOrder && (
          <button
            onClick={reorder}
            disabled={reordering}
            className="mt-6 w-full bg-brand-600 text-white rounded-xl p-3.5 flex items-center justify-center gap-2 font-medium shadow-card hover:bg-brand-700 transition disabled:opacity-60"
          >
            🔁 {reordering ? 'Adding to cart…' : 'Order again (your last order)'}
          </button>
        )}

        <div className="grid grid-cols-2 gap-4 mt-6">
          {buttons.map((b) => (
            <button
              key={b.label}
              onClick={b.onClick}
              disabled={b.disabled}
              className={`bg-white rounded-2xl shadow-card p-6 flex flex-col items-center gap-2 transition ${
                b.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-lg hover:-translate-y-0.5'
              }`}
            >
              <span className="text-3xl">{b.icon}</span>
              <span className="font-semibold text-ink-900 text-sm">{b.label}</span>
            </button>
          ))}
        </div>

        <InstallAppButton />
      </div>
    </div>
  );
}
