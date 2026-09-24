import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { updateQuantity, removeItem, updateInstructions } from '../features/cartSlice';

export default function CartPage() {
  const { tenantSlug, tableId } = useParams();
  const cart = useSelector((s) => s.cart.items);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div className="max-w-lg mx-auto pb-40">
      <header className="bg-gradient-to-r from-ink-950 to-brand-800 text-white p-4 sticky top-0 z-10 rounded-b-2xl shadow-lg flex items-center gap-3">
        <button onClick={() => navigate(-1)}>←</button>
        <h1 className="text-lg font-bold">Your Cart</h1>
      </header>

      <div className="p-4 space-y-3">
        {cart.length === 0 && <p className="text-gray-500 text-center mt-8">Cart is empty.</p>}
        {cart.map((item) => (
          <div key={item.menuItemId} className="bg-white rounded-xl shadow-card p-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/menu/${tenantSlug}/${tableId}/dish/${item.menuItemId}`)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
                )}
                <div className="min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-brand-600 text-sm font-semibold">₹{item.price} × {item.quantity} = ₹{item.price * item.quantity}</p>
                </div>
              </button>
              <button
                onClick={() => dispatch(removeItem(item.menuItemId))}
                className="text-red-500 text-xs font-medium px-2 py-1 flex-shrink-0"
                aria-label="Remove item"
              >
                🗑️ Remove
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <button onClick={() => item.quantity === 1 ? dispatch(removeItem(item.menuItemId)) : dispatch(updateQuantity({ menuItemId: item.menuItemId, quantity: item.quantity - 1 }))}
                  className="w-7 h-7 bg-gray-200 rounded">−</button>
                <span>{item.quantity}</span>
                <button onClick={() => dispatch(updateQuantity({ menuItemId: item.menuItemId, quantity: item.quantity + 1 }))}
                  className="w-7 h-7 bg-gray-200 rounded">+</button>
              </div>
            </div>
            <input
              placeholder="Special instructions (e.g. make it spicy)"
              value={item.specialInstructions}
              onChange={(e) => dispatch(updateInstructions({ menuItemId: item.menuItemId, specialInstructions: e.target.value }))}
              className="mt-2 w-full text-sm border rounded px-2 py-1"
            />
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <div
          className="fixed left-0 right-0 bg-white border-t p-4 max-w-lg mx-auto"
          style={{ bottom: 'calc(60px + var(--safe-bottom))' }}
        >
          <div className="flex justify-between mb-3 font-semibold">
            <span>Subtotal</span>
            <span>₹{subtotal}</span>
          </div>
          <button
            onClick={() => navigate(`/menu/${tenantSlug}/${tableId}/checkout`)}
            className="w-full bg-brand-600 text-white py-3 rounded-lg font-semibold"
          >
            Proceed to Checkout
          </button>
        </div>
      )}
    </div>
  );
}
