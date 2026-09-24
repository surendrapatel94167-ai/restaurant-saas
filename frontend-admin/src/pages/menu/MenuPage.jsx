import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api from '../../api/axios';
import { useConfirm } from '../../components/ConfirmProvider';

const emptyForm = { name: '', description: '', category: '', price: '', discountActive: false, discountPercentage: '', imageUrl: '', isVeg: true, spiceLevel: 'mild' };

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function MenuPage() {
  const { user } = useSelector((s) => s.auth);
  const canManage = ['hotel_admin', 'manager'].includes(user?.role);
  const canToggleAvailability = canManage || user?.role === 'chef';
  const { confirm } = useConfirm();

  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const load = async () => {
    const { data } = await api.get('/menu');
    setItems(data);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setFieldErrors({}); };

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setForm((f) => ({ ...f, imageUrl: dataUrl }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const errs = {};
    if (!form.name.trim()) errs.name = 'Dish name is required';
    if (!form.category.trim()) errs.category = 'Category is required';
    if (!form.price) errs.price = 'Price is required';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    const payload = {
      name: { en: form.name },
      description: { en: form.description },
      category: form.category,
      price: Number(form.price),
      imageUrl: form.imageUrl,
      isVeg: form.isVeg,
      spiceLevel: form.spiceLevel,
      discount: {
        isActive: form.discountActive,
        percentage: form.discountActive ? Number(form.discountPercentage) || 0 : 0,
      },
    };
    try {
      if (editingId) {
        await api.put(`/menu/${editingId}`, payload);
      } else {
        await api.post('/menu', payload);
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save item');
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setFieldErrors({});
    setForm({
      name: item.name?.en || '',
      description: item.description?.en || '',
      category: item.category,
      price: item.price,
      discountActive: !!item.discount?.isActive,
      discountPercentage: item.discount?.percentage || '',
      imageUrl: item.imageUrl || '',
      isVeg: item.isVeg !== false,
      spiceLevel: item.spiceLevel || 'mild',
    });
  };

  const toggleAvailability = async (id) => {
    await api.patch(`/menu/${id}/toggle-availability`);
    load();
  };

  const removeItem = async (id) => {
    const ok = await confirm({ title: 'Remove this dish?', message: 'It will disappear from the customer menu.', danger: true });
    if (!ok) return;
    await api.delete(`/menu/${id}`);
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 mb-1">Menu</h1>
      <p className="text-sm text-gray-500 mb-5">
        {canManage ? 'Add, edit, price and discount dishes — changes reflect on the customer menu instantly.' : 'Today\u2019s menu — mark items out of stock as they run out.'}
      </p>

      {canManage && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-card mb-6 flex gap-3 items-start flex-wrap">
          <div className="flex flex-col items-center gap-1">
            {form.imageUrl ? (
              <img src={form.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">🍽️</div>
            )}
            <input type="file" accept="image/*" onChange={handleImage} className="text-xs w-16" />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border rounded px-2 py-1" />
            {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-600">Category</label>
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="border rounded px-2 py-1" />
            {fieldErrors.category && <p className="text-red-500 text-xs mt-1">{fieldErrors.category}</p>}
          </div>
          <div className="w-full">
            <label className="block text-sm text-gray-600">Description (optional)</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2} className="border rounded px-2 py-1 w-full" placeholder="What's in it, how it's made, allergens…" />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Price (₹)</label>
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="border rounded px-2 py-1 w-24" />
            {fieldErrors.price && <p className="text-red-500 text-xs mt-1">{fieldErrors.price}</p>}
          </div>
          <label className="flex items-center gap-1.5 text-sm text-gray-700 pb-1.5 self-end">
            <input type="checkbox" checked={form.discountActive}
              onChange={(e) => setForm({ ...form, discountActive: e.target.checked })} />
            On offer
          </label>
          <div>
            <label className="block text-sm text-gray-600">Type</label>
            <select value={form.isVeg ? 'veg' : 'nonveg'} onChange={(e) => setForm({ ...form, isVeg: e.target.value === 'veg' })}
              className="border rounded px-2 py-1">
              <option value="veg">🟢 Veg</option>
              <option value="nonveg">🔴 Non-veg</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600">Spice</label>
            <select value={form.spiceLevel} onChange={(e) => setForm({ ...form, spiceLevel: e.target.value })}
              className="border rounded px-2 py-1">
              <option value="mild">Mild</option>
              <option value="medium">Medium 🌶️🌶️</option>
              <option value="hot">Hot 🌶️🌶️🌶️</option>
            </select>
          </div>
          {form.discountActive && (
            <div>
              <label className="block text-sm text-gray-600">Discount %</label>
              <input type="number" min="0" max="90" value={form.discountPercentage}
                onChange={(e) => setForm({ ...form, discountPercentage: e.target.value })}
                className="border rounded px-2 py-1 w-20" />
            </div>
          )}
          <button className="bg-brand-600 text-white px-4 py-2 rounded hover:bg-brand-700 self-end">
            {editingId ? 'Save changes' : 'Add Item'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-sm text-gray-500 px-2 self-end">Cancel</button>
          )}
          {error && <span className="text-red-500 text-sm self-end">{error}</span>}
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item._id} className="bg-white rounded-xl shadow-card overflow-hidden hover:shadow-lg transition">
            {item.imageUrl && <img src={item.imageUrl} alt={item.name?.en} className="w-full h-32 object-cover" />}
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-ink-900 flex items-center gap-1.5">
                    <span className={`w-3 h-3 border flex items-center justify-center ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                    </span>
                    {item.name?.en}
                  </h3>
                  <p className="text-sm text-gray-500">{item.category}</p>
                  <p className="text-brand-600 font-bold mt-1">
                    ₹{item.price}
                    {item.discount?.isActive && item.discount.percentage > 0 && (
                      <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">
                        {item.discount.percentage}% OFF
                      </span>
                    )}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {item.isAvailable ? 'Available' : 'Out of Stock'}
                </span>
              </div>
              <div className="flex gap-3 mt-3 text-sm">
                {canManage && <button onClick={() => startEdit(item)} className="text-brand-600 font-medium hover:text-brand-700">Edit</button>}
                {canToggleAvailability && (
                  <button onClick={() => toggleAvailability(item._id)} className="text-brand-600 font-medium hover:text-brand-700">
                    Toggle availability
                  </button>
                )}
                {canManage && <button onClick={() => removeItem(item._id)} className="text-red-500 font-medium hover:text-red-600">Remove</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
