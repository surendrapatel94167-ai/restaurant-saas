import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import api from '../../api/axios';
import { useConfirm } from '../../components/ConfirmProvider';
import { useToast } from '../../components/ToastProvider';

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
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const load = async () => {
    const { data } = await api.get('/menu');
    setItems(data);
  };

  useEffect(() => { load(); }, []);

  const categories = useMemo(() => ['All', ...new Set(items.map((i) => i.category).filter(Boolean))], [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeCategory !== 'All' && item.category !== activeCategory) return false;
      if (search && !item.name?.en?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, activeCategory, search]);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setFieldErrors({}); setError(''); setShowForm(false); };

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
        toast.success('Dish updated');
      } else {
        await api.post('/menu', payload);
        toast.success('Dish added');
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save item');
      toast.error('Failed to save dish');
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
    setShowForm(true);
  };

  const toggleAvailability = async (id) => {
    await api.patch(`/menu/${id}/toggle-availability`);
    toast.success('Availability updated');
    load();
  };

  const removeItem = async (id) => {
    const ok = await confirm({ title: 'Remove this dish?', message: 'It will disappear from the customer menu.', danger: true });
    if (!ok) return;
    await api.delete(`/menu/${id}`);
    toast.success('Dish removed');
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-1 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Menu Items</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {canManage ? 'Add, edit, price and discount dishes — changes reflect on the customer menu instantly.' : 'Today\u2019s menu — mark items out of stock as they run out.'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="bg-brand-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-brand-700 flex items-center gap-1.5 flex-shrink-0"
          >
            <Plus size={16} /> Add Item
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 my-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search food items..."
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm bg-white"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-sm px-3.5 py-1.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${
                activeCategory === cat ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredItems.map((item) => (
          <div key={item._id} className="bg-white rounded-xl shadow-card overflow-hidden hover:shadow-lg transition">
            <div className="relative">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name?.en} className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-3xl">🍽️</div>
              )}
              <span className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-1 rounded-full ${item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {item.isAvailable ? 'Active' : 'Out of Stock'}
              </span>
              {item.discount?.isActive && item.discount.percentage > 0 && (
                <span className="absolute top-2 left-2 text-[10px] font-semibold bg-brand-600 text-white px-2 py-1 rounded-full">
                  {item.discount.percentage}% OFF
                </span>
              )}
            </div>
            <div className="p-3.5">
              <h3 className="font-semibold text-ink-900 flex items-center gap-1.5 truncate">
                <span className={`w-3 h-3 border flex items-center justify-center flex-shrink-0 ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                </span>
                <span className="truncate">{item.name?.en}</span>
              </h3>
              <p className="text-xs text-gray-500">{item.category}</p>
              <div className="flex justify-between items-center mt-2">
                <p className="text-brand-600 font-bold">₹{item.price}</p>
                <div className="flex items-center gap-2">
                  {canToggleAvailability && (
                    <button onClick={() => toggleAvailability(item._id)} title="Toggle availability" className="text-gray-400 hover:text-brand-600">
                      <span className={`block w-8 h-[18px] rounded-full relative transition ${item.isAvailable ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <span className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all ${item.isAvailable ? 'left-4' : 'left-0.5'}`} />
                      </span>
                    </button>
                  )}
                  {canManage && (
                    <>
                      <button onClick={() => startEdit(item)} title="Edit" className="text-gray-400 hover:text-brand-600"><Pencil size={15} /></button>
                      <button onClick={() => removeItem(item._id)} title="Remove" className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && (
          <p className="col-span-full text-center text-gray-400 py-10">No dishes match — try a different search or category.</p>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={resetForm}>
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-ink-900 text-lg">{editingId ? 'Edit Dish' : 'Add New Dish'}</h2>
              <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
                )}
                <input type="file" accept="image/*" onChange={handleImage} className="text-xs" />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded-lg px-3 py-2 w-full" />
                {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Category</label>
                  <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="border rounded-lg px-3 py-2 w-full" />
                  {fieldErrors.category && <p className="text-red-500 text-xs mt-1">{fieldErrors.category}</p>}
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Price (₹)</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="border rounded-lg px-3 py-2 w-full" />
                  {fieldErrors.price && <p className="text-red-500 text-xs mt-1">{fieldErrors.price}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Description (optional)</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2} className="border rounded-lg px-3 py-2 w-full" placeholder="What's in it, how it's made, allergens…" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Type</label>
                  <select value={form.isVeg ? 'veg' : 'nonveg'} onChange={(e) => setForm({ ...form, isVeg: e.target.value === 'veg' })} className="border rounded-lg px-3 py-2 w-full">
                    <option value="veg">🟢 Veg</option>
                    <option value="nonveg">🔴 Non-veg</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Spice</label>
                  <select value={form.spiceLevel} onChange={(e) => setForm({ ...form, spiceLevel: e.target.value })} className="border rounded-lg px-3 py-2 w-full">
                    <option value="mild">Mild</option>
                    <option value="medium">Medium 🌶️🌶️</option>
                    <option value="hot">Hot 🌶️🌶️🌶️</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.discountActive} onChange={(e) => setForm({ ...form, discountActive: e.target.checked })} />
                On offer
              </label>
              {form.discountActive && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Discount %</label>
                  <input type="number" min="0" max="90" value={form.discountPercentage}
                    onChange={(e) => setForm({ ...form, discountPercentage: e.target.value })}
                    className="border rounded-lg px-3 py-2 w-28" />
                </div>
              )}

              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>

            <div className="flex gap-2 mt-5">
              <button type="button" onClick={resetForm} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200">Cancel</button>
              <button className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700">
                {editingId ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
