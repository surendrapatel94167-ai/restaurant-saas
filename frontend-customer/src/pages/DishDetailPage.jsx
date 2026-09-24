import { useEffect, useState } from 'react';
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

export default function DishDetailPage() {
  const { tenantSlug, tableId, dishId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cart = useSelector((s) => s.cart.items);
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/customer/${tenantSlug}/menu/${dishId}`)
      .then(({ data }) => setData(data))
      .catch((err) => { if (err.response?.status === 404) setNotFound(true); });
  }, [tenantSlug, dishId]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#fbf7f4] flex flex-col items-center justify-center px-6 text-center">
        <span className="text-5xl mb-4">🍽️</span>
        <h1 className="text-xl font-bold text-ink-900">Dish not found</h1>
        <button onClick={() => navigate(`/menu/${tenantSlug}/${tableId}/items`)} className="mt-4 text-brand-600 font-medium">← Back to menu</button>
      </div>
    );
  }

  if (!data) return <p className="text-center mt-8 text-gray-500">Loading…</p>;

  const { item, reviews } = data;
  const cartEntry = cart.find((i) => i.menuItemId === item._id);
  const qty = cartEntry?.quantity || 0;
  const finalPrice = discountedPrice(item);
  const hasOffer = item.discount?.isActive && item.discount.percentage > 0;

  const addToCart = () => dispatch(addItem({ menuItemId: item._id, name: item.name?.en, price: finalPrice, imageUrl: item.imageUrl }));

  const buyNow = () => {
    if (qty === 0) addToCart();
    navigate(`/menu/${tenantSlug}/${tableId}/cart`);
  };

  return (
    <div className="max-w-lg mx-auto pb-40 min-h-screen bg-[#fbf7f4]">
      <header className="sticky top-0 z-10 p-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/90 shadow-card flex items-center justify-center text-lg">←</button>
      </header>

      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.name?.en} className="w-full h-56 object-cover -mt-16" />
      ) : (
        <div className="w-full h-56 -mt-16 bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center text-6xl">🍽️</div>
      )}

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-3.5 h-3.5 border flex items-center justify-center flex-shrink-0 ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
            </span>
            <h1 className="text-xl font-bold text-ink-900">{item.name?.en}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <p className="text-brand-600 text-lg font-bold">₹{finalPrice}</p>
            {hasOffer && (
              <>
                <p className="text-gray-400 text-sm line-through">₹{item.price}</p>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">{item.discount.percentage}% OFF</span>
              </>
            )}
            {item.spiceLevel && item.spiceLevel !== 'mild' && <span className="text-sm">{SPICE_ICON[item.spiceLevel]}</span>}
          </div>
          {item.avgRating && (
            <p className="text-sm text-amber-600 font-medium mb-2">⭐ {item.avgRating} ({item.reviewCount} review{item.reviewCount === 1 ? '' : 's'})</p>
          )}
          {item.description?.en && <p className="text-sm text-gray-600 leading-relaxed">{item.description.en}</p>}
        </div>

        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">Reviews</h2>
            <button
              onClick={() => navigate(`/menu/${tenantSlug}/${tableId}/review`)}
              className="text-xs text-brand-600 font-medium"
            >
              ⭐ Rate this dish
            </button>
          </div>
          {reviews.length === 0 && <p className="text-sm text-gray-400">No reviews yet — be the first!</p>}
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r._id} className="border-b last:border-0 pb-3 last:pb-0">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm text-ink-900">{r.customerName}</span>
                  <span className="text-amber-500 text-sm">{'⭐'.repeat(r.rating)}</span>
                </div>
                {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="fixed left-0 right-0 bg-white border-t p-4 max-w-lg mx-auto flex gap-3"
        style={{ bottom: 'calc(60px + var(--safe-bottom))' }}
      >
        {qty === 0 ? (
          <button onClick={addToCart} className="flex-1 border-2 border-brand-600 text-brand-600 py-3 rounded-lg font-semibold">
            Add to Cart
          </button>
        ) : (
          <div className="flex-1 flex items-center justify-center gap-4 border-2 border-brand-600 rounded-lg">
            <button
              onClick={() => qty === 1 ? dispatch(removeItem(item._id)) : dispatch(updateQuantity({ menuItemId: item._id, quantity: qty - 1 }))}
              className="w-10 h-10 text-brand-700 font-bold text-lg"
            >−</button>
            <span className="font-semibold text-brand-700">{qty}</span>
            <button
              onClick={() => dispatch(updateQuantity({ menuItemId: item._id, quantity: qty + 1 }))}
              className="w-10 h-10 text-brand-700 font-bold text-lg"
            >+</button>
          </div>
        )}
        <button onClick={buyNow} className="flex-1 bg-brand-600 text-white py-3 rounded-lg font-semibold">
          Buy Now
        </button>
      </div>
    </div>
  );
}
