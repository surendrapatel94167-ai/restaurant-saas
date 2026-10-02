import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import api from '../api/axios';
import { addItem, updateQuantity, removeItem } from '../features/cartSlice';

function discountedPrice(item) {
  if (item.discount?.isActive && item.discount.percentage > 0) {
    return Math.round(item.price * (1 - item.discount.percentage / 100));
  }
  return item.price;
}

const SPICE_ICON = { mild: '🌶️', medium: '🌶️🌶️', hot: '🌶️🌶️🌶️' };

function DishCard({ item, qty, onAdd, onInc, onDec, onOpen }) {
  const hasOffer = item.discount?.isActive && item.discount.percentage > 0;
  const finalPrice = discountedPrice(item);
  return (
    <div className="bg-white rounded-xl shadow-card p-3.5 flex justify-between items-center gap-3">
      <button onClick={onOpen} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        {item.imageUrl && (
          <img src={item.imageUrl} alt={item.name?.en} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`w-3.5 h-3.5 border flex items-center justify-center flex-shrink-0 ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
            </span>
            <p className="font-medium text-ink-900 truncate">{item.name?.en}</p>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-brand-600 text-sm font-semibold">₹{finalPrice}</p>
            {hasOffer && (
              <>
                <p className="text-gray-400 text-xs line-through">₹{item.price}</p>
                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">
                  {item.discount.percentage}% OFF
                </span>
              </>
            )}
            {item.avgRating && (
              <span className="text-[11px] text-amber-600 font-medium">⭐ {item.avgRating} ({item.reviewCount})</span>
            )}
            {item.spiceLevel && item.spiceLevel !== 'mild' && (
              <span className="text-[11px]">{SPICE_ICON[item.spiceLevel]}</span>
            )}
          </div>
        </div>
      </button>
      {qty === 0 ? (
        <button
          onClick={onAdd}
          className="bg-brand-600 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition flex-shrink-0"
        >
          Add
        </button>
      ) : (
        <div className="flex items-center gap-3 bg-brand-50 rounded-lg px-1 flex-shrink-0">
          <button onClick={onDec} className="w-7 h-7 text-brand-700 font-bold">−</button>
          <span className="font-medium text-ink-900">{qty}</span>
          <button onClick={onInc} className="w-7 h-7 text-brand-700 font-bold">+</button>
        </div>
      )}
    </div>
  );
}

export default function MenuPage() {
  const { tenantSlug, tableId } = useParams();
  const [menu, setMenu] = useState({ tenant: null, items: [] });
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch] = useState('');
  const [vegFilter, setVegFilter] = useState('all'); // all | veg | nonveg
  const [maxPrice, setMaxPrice] = useState('');
  const dispatch = useDispatch();
  const cart = useSelector((s) => s.cart.items);
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/customer/${tenantSlug}/menu`)
      .then(({ data }) => setMenu(data))
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true);
      });
  }, [tenantSlug]);

  const filteredItems = useMemo(() => {
    return menu.items.filter((item) => {
      if (search && !item.name?.en?.toLowerCase().includes(search.toLowerCase())) return false;
      if (vegFilter === 'veg' && !item.isVeg) return false;
      if (vegFilter === 'nonveg' && item.isVeg) return false;
      if (maxPrice && discountedPrice(item) > Number(maxPrice)) return false;
      return true;
    });
  }, [menu.items, search, vegFilter, maxPrice]);

  const offers = filteredItems.filter((i) => i.discount?.isActive && i.discount.percentage > 0);

  const grouped = filteredItems.reduce((acc, item) => {
    acc[item.category] = acc[item.category] || [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const cartQty = (id) => cart.find((i) => i.menuItemId === id)?.quantity || 0;
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  const addToCart = (item) => dispatch(addItem({
    menuItemId: item._id, name: item.name?.en, price: discountedPrice(item), imageUrl: item.imageUrl,
  }));

  const openDish = (item) => navigate(`/menu/${tenantSlug}/${tableId}/dish/${item._id}`);

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center px-6 text-center">
        <span className="text-5xl mb-4">🔍</span>
        <h1 className="text-xl font-bold text-ink-900">Restaurant not found</h1>
        <p className="text-gray-500 mt-2 text-sm max-w-xs">
          This link doesn't match any restaurant. Please rescan the table QR code.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-40 min-h-screen bg-[#F7F8FA]">
      <header className="bg-gradient-to-r from-ink-950 to-brand-800 text-white p-5 sticky top-0 z-10 rounded-b-2xl shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(`/menu/${tenantSlug}/${tableId}`)} className="text-lg">←</button>
          <div>
            <h1 className="text-xl font-bold">{menu.tenant?.hotelName || 'Digital Menu'}</h1>
            {tableId && tableId !== 'no-table' && <p className="text-xs opacity-80 mt-0.5">Table {tableId.slice(-4)}</p>}
          </div>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search dishes…"
          className="w-full rounded-lg px-3 py-2 text-sm text-ink-900 outline-none"
        />
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {[['all', 'All'], ['veg', '🟢 Veg'], ['nonveg', '🔴 Non-veg']].map(([val, label]) => (
            <button key={val} onClick={() => setVegFilter(val)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${vegFilter === val ? 'bg-white text-brand-700' : 'bg-white/20 text-white'}`}>
              {label}
            </button>
          ))}
          <input
            type="number" placeholder="Max ₹" value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="text-xs px-2.5 py-1 rounded-full w-20 text-ink-900 outline-none"
          />
        </div>
      </header>

      <div className="p-4 space-y-6">
        {offers.length > 0 && (
          <div>
            <h2 className="font-semibold text-brand-700 mb-2 text-sm uppercase tracking-wide">🔥 Today's Offers</h2>
            <div className="space-y-2.5">
              {offers.map((item) => {
                const qty = cartQty(item._id);
                return (
                  <DishCard key={item._id} item={item} qty={qty}
                    onAdd={() => addToCart(item)}
                    onOpen={() => openDish(item)}
                    onInc={() => dispatch(updateQuantity({ menuItemId: item._id, quantity: qty + 1 }))}
                    onDec={() => qty === 1 ? dispatch(removeItem(item._id)) : dispatch(updateQuantity({ menuItemId: item._id, quantity: qty - 1 }))}
                  />
                );
              })}
            </div>
          </div>
        )}

        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h2 className="font-semibold text-ink-900 mb-2 text-sm uppercase tracking-wide text-brand-700">{category}</h2>
            <div className="space-y-2.5">
              {items.map((item) => {
                const qty = cartQty(item._id);
                return (
                  <DishCard key={item._id} item={item} qty={qty}
                    onAdd={() => addToCart(item)}
                    onOpen={() => openDish(item)}
                    onInc={() => dispatch(updateQuantity({ menuItemId: item._id, quantity: qty + 1 }))}
                    onDec={() => qty === 1 ? dispatch(removeItem(item._id)) : dispatch(updateQuantity({ menuItemId: item._id, quantity: qty - 1 }))}
                  />
                );
              })}
            </div>
          </div>
        ))}
        {menu.items.length === 0 && <p className="text-gray-500 text-center mt-8">Loading menu…</p>}
        {menu.items.length > 0 && filteredItems.length === 0 && <p className="text-gray-500 text-center mt-8">No dishes match your filters.</p>}
      </div>

      {totalItems > 0 && (
        <button
          onClick={() => navigate(`/menu/${tenantSlug}/${tableId}/cart`)}
          className="fixed left-4 right-4 max-w-lg mx-auto bg-brand-600 text-white py-3.5 rounded-xl shadow-2xl font-semibold hover:bg-brand-700 transition"
          style={{ bottom: 'calc(64px + var(--safe-bottom))' }}
        >
          View Cart ({totalItems})
        </button>
      )}
    </div>
  );
}
