import { useEffect, useState } from 'react';
import api from '../../api/axios';

const now = new Date();

export default function FinancePage() {
  const [dashboard, setDashboard] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [expenseForm, setExpenseForm] = useState({ itemName: '', category: '', amount: '', quantity: '' });
  const [vendorForm, setVendorForm] = useState({ name: '', contactPhone: '' });
  const [pnlGranularity, setPnlGranularity] = useState('month'); // day | month | year
  const [pnlDate, setPnlDate] = useState({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
  const [pnl, setPnl] = useState(null);

  const loadAll = async () => {
    const [d, e, v] = await Promise.all([
      api.get('/finance/dashboard'),
      api.get('/finance/expenses'),
      api.get('/finance/vendors'),
    ]);
    setDashboard(d.data);
    setExpenses(e.data);
    setVendors(v.data);
  };

  useEffect(() => { loadAll(); }, []);

  const addExpense = async (e) => {
    e.preventDefault();
    await api.post('/finance/expenses', {
      itemName: expenseForm.itemName,
      category: expenseForm.category,
      quantity: expenseForm.quantity,
      amount: Number(expenseForm.amount),
    });
    setExpenseForm({ itemName: '', category: '', amount: '', quantity: '' });
    loadAll();
  };

  const addVendor = async (e) => {
    e.preventDefault();
    await api.post('/finance/vendors', vendorForm);
    setVendorForm({ name: '', contactPhone: '' });
    loadAll();
  };

  const loadPnl = async () => {
    const params = { year: pnlDate.year };
    if (pnlGranularity === 'month' || pnlGranularity === 'day') params.month = pnlDate.month;
    if (pnlGranularity === 'day') params.day = pnlDate.day;
    const { data } = await api.get('/finance/pnl', { params });
    setPnl(data);
  };

  const totalSales = dashboard.reduce((s, d) => s + d.totalSales, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink-900">Finance</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-500 text-sm">Total Sales (loaded range)</p>
          <p className="text-2xl font-bold text-brand-600">₹{totalSales}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-500 text-sm">Days with data</p>
          <p className="text-2xl font-bold">{dashboard.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-500 text-sm mb-2">Profit & Loss</p>
          <div className="flex gap-1 mb-2">
            {['day', 'month', 'year'].map((g) => (
              <button key={g} onClick={() => setPnlGranularity(g)}
                className={`text-xs px-2 py-1 rounded-full capitalize ${pnlGranularity === g ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {g}
              </button>
            ))}
          </div>
          <div className="flex gap-1 mb-2">
            <input type="number" value={pnlDate.year} onChange={(e) => setPnlDate({ ...pnlDate, year: e.target.value })} className="border rounded px-1 py-0.5 w-16 text-xs" />
            {(pnlGranularity === 'month' || pnlGranularity === 'day') && (
              <input type="number" min="1" max="12" value={pnlDate.month} onChange={(e) => setPnlDate({ ...pnlDate, month: e.target.value })} className="border rounded px-1 py-0.5 w-12 text-xs" />
            )}
            {pnlGranularity === 'day' && (
              <input type="number" min="1" max="31" value={pnlDate.day} onChange={(e) => setPnlDate({ ...pnlDate, day: e.target.value })} className="border rounded px-1 py-0.5 w-12 text-xs" />
            )}
          </div>
          <button onClick={loadPnl} className="bg-brand-600 text-white text-sm py-1.5 px-3 rounded hover:bg-brand-700 w-full">
            Calculate
          </button>
          {pnl && (
            <div className="text-sm mt-2">
              <p>Revenue: ₹{pnl.totalRevenue}</p>
              <p>Expenses: ₹{pnl.totalExpenses}</p>
              <p className={`font-bold ${pnl.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>Net: ₹{pnl.netProfit}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3">Purchases / Expenses</h2>
          <form onSubmit={addExpense} className="grid grid-cols-2 gap-2 mb-3">
            <input placeholder="Item bought (e.g. paneer, gas cylinder)" value={expenseForm.itemName}
              onChange={(e) => setExpenseForm({ ...expenseForm, itemName: e.target.value })}
              className="border rounded px-2 py-1 col-span-2" />
            <input placeholder="Category (grocery, rent...)" value={expenseForm.category}
              onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
              className="border rounded px-2 py-1" required />
            <input placeholder="Qty (e.g. 5kg)" value={expenseForm.quantity}
              onChange={(e) => setExpenseForm({ ...expenseForm, quantity: e.target.value })}
              className="border rounded px-2 py-1" />
            <input type="number" placeholder="Amount" value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              className="border rounded px-2 py-1 col-span-2" required />
            <button className="bg-brand-600 text-white px-3 py-1 rounded hover:bg-brand-700 col-span-2">Add Purchase</button>
          </form>
          <ul className="text-sm space-y-1 max-h-64 overflow-y-auto">
            {expenses.map((e) => (
              <li key={e._id} className="flex justify-between border-b py-1">
                <span>{e.itemName || e.category} {e.quantity && `(${e.quantity})`}</span>
                <span>₹{e.amount}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3">Vendor Khata</h2>
          <form onSubmit={addVendor} className="flex gap-2 mb-3">
            <input placeholder="Vendor name" value={vendorForm.name}
              onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
              className="border rounded px-2 py-1 flex-1" required />
            <input placeholder="Phone" value={vendorForm.contactPhone}
              onChange={(e) => setVendorForm({ ...vendorForm, contactPhone: e.target.value })}
              className="border rounded px-2 py-1 w-32" />
            <button className="bg-brand-600 text-white px-3 rounded hover:bg-brand-700">Add</button>
          </form>
          <ul className="text-sm space-y-1 max-h-64 overflow-y-auto">
            {vendors.map((v) => (
              <li key={v._id} className="flex justify-between border-b py-1">
                <span>{v.name}</span>
                <span className={v.khataBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                  ₹{v.khataBalance} {v.khataBalance > 0 ? 'due' : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
