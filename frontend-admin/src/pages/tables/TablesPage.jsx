import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useConfirm } from '../../components/ConfirmProvider';

export default function TablesPage() {
  const [tables, setTables] = useState([]);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [error, setError] = useState('');
  const { confirm } = useConfirm();

  const load = async () => {
    const { data } = await api.get('/tables');
    setTables(data);
  };

  useEffect(() => { load(); }, []);

  const addTable = async (e) => {
    e.preventDefault();
    setError('');
    if (!newTableNumber.trim()) {
      setError('Please enter a table number.');
      return;
    }
    try {
      await api.post('/tables', { tableNumber: newTableNumber });
      setNewTableNumber('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add table');
    }
  };

  const regenerate = async (id) => {
    await api.post(`/tables/${id}/regenerate`);
    load();
  };

  const removeTable = async (id) => {
    const ok = await confirm({ title: 'Remove this table?', message: 'Its QR code will stop working.', danger: true });
    if (!ok) return;
    await api.delete(`/tables/${id}`);
    load();
  };

  const printOne = (table) => {
    const w = window.open('', '_blank');
    w.document.write(`
      <html><head><title>Table ${table.tableNumber}</title></head>
      <body style="text-align:center;font-family:sans-serif;padding:40px;">
        <h2>Table ${table.tableNumber}</h2>
        <img src="${table.qrCodeUrl}" style="width:280px;height:280px;" />
        <p>Scan to view menu & order</p>
        <script>window.print();</script>
      </body></html>
    `);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 mb-1">Tables & QR Codes</h1>
      <p className="text-sm text-gray-500 mb-5">Print a fresh QR if one gets damaged or lost, or add a new table.</p>

      <form onSubmit={addTable} className="bg-white rounded-xl shadow-card p-4 mb-6 flex gap-3 items-end">
        <div>
          <label className="block text-sm text-gray-600">New table number</label>
          <input value={newTableNumber} onChange={(e) => setNewTableNumber(e.target.value)}
            className="border rounded px-2 py-1 w-32" placeholder="e.g. 21" required />
        </div>
        <button className="bg-brand-600 text-white px-4 py-2 rounded hover:bg-brand-700">Add Table</button>
        {error && <span className="text-red-500 text-sm">{error}</span>}
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {tables.map((t) => (
          <div key={t._id} className="bg-white rounded-xl shadow-card p-3 text-center">
            <p className="font-semibold text-ink-900 mb-2">Table {t.tableNumber}</p>
            {t.qrCodeUrl && <img src={t.qrCodeUrl} alt={`QR ${t.tableNumber}`} className="w-full aspect-square object-contain mb-2" />}
            <div className="flex flex-col gap-1 text-xs">
              <button onClick={() => printOne(t)} className="text-brand-600 font-medium hover:underline">🖨️ Print</button>
              <button onClick={() => regenerate(t._id)} className="text-brand-600 font-medium hover:underline">🔄 Regenerate</button>
              <button onClick={() => removeTable(t._id)} className="text-red-500 font-medium hover:underline">Remove</button>
            </div>
          </div>
        ))}
        {tables.length === 0 && <p className="text-gray-400 col-span-full text-center py-8">No tables yet — add one above.</p>}
      </div>
    </div>
  );
}
