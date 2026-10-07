import { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import api from '../../api/axios';
import { useConfirm } from '../../components/ConfirmProvider';
import { useToast } from '../../components/ToastProvider';

export default function TablesPage() {
  const [tables, setTables] = useState([]);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [openTable, setOpenTable] = useState(null); // table shown in the detail popup
  const [busy, setBusy] = useState(false);
  const { confirm } = useConfirm();
  const toast = useToast();

  const load = async () => {
    try {
      const { data } = await api.get('/tables');
      setTables(data);
      // drop selections / popup for tables that no longer exist
      const ids = new Set(data.map((t) => t._id));
      setSelected((prev) => new Set([...prev].filter((id) => ids.has(id))));
      setOpenTable((cur) => (cur ? data.find((t) => t._id === cur._id) || null : null));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load tables');
    }
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
      await api.post('/tables', { tableNumber: newTableNumber.trim() });
      setNewTableNumber('');
      toast.success('Table added');
      load();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to add table';
      setError(message);
      toast.error(message);
    }
  };

  const regenerate = async (id) => {
    try {
      await api.post(`/tables/${id}/regenerate`);
      toast.success('QR code regenerated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not regenerate QR');
    }
  };

  const removeTable = async (id) => {
    const ok = await confirm({ title: 'Remove this table?', message: 'Its QR code will stop working.', danger: true });
    if (!ok) return;
    try {
      await api.delete(`/tables/${id}`);
      toast.success('Table removed');
      setOpenTable(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove table');
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSelected = tables.length > 0 && selected.size === tables.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(tables.map((t) => t._id)));

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    const ok = await confirm({
      title: allSelected ? 'Delete ALL tables?' : `Delete ${selected.size} selected table${selected.size === 1 ? '' : 's'}?`,
      message: 'Their QR codes will stop working. This cannot be undone.',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const { data } = await api.post('/tables/bulk-delete', allSelected ? { all: true } : { ids: [...selected] });
      toast.success(`${data.deleted} table${data.deleted === 1 ? '' : 's'} deleted`);
      setSelected(new Set());
      setOpenTable(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete tables');
    } finally {
      setBusy(false);
    }
  };

  const printOne = (table) => {
    const w = window.open('', '_blank');
    if (!w) { toast.error('Please allow pop-ups to print'); return; }
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
      <p className="text-sm text-gray-500 mb-5">Tap a table to open its QR. Print a fresh QR if one gets damaged, add a new table, or select several to delete together.</p>

      <form onSubmit={addTable} className="bg-white rounded-xl shadow-card p-4 mb-4 flex gap-3 items-end flex-wrap">
        <div>
          <label className="block text-sm text-gray-600">New table number</label>
          <input value={newTableNumber} onChange={(e) => setNewTableNumber(e.target.value)}
            className="border rounded px-2 py-1 w-32" placeholder="e.g. 21" />
        </div>
        <button className="bg-brand-600 text-white px-4 py-2 rounded hover:bg-brand-700">Add Table</button>
        {error && <span className="text-red-500 text-sm">{error}</span>}
      </form>

      {tables.length > 0 && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4" />
            Select all ({tables.length})
          </label>
          {selected.size > 0 && (
            <>
              <span className="text-sm text-gray-500">{selected.size} selected</span>
              <button
                onClick={deleteSelected}
                disabled={busy}
                className="bg-red-600 text-white text-sm px-3.5 py-1.5 rounded-lg font-medium hover:bg-red-700 flex items-center gap-1.5 disabled:opacity-60"
              >
                <Trash2 size={14} /> {allSelected ? 'Delete all' : 'Delete selected'}
              </button>
              <button onClick={() => setSelected(new Set())} className="text-sm text-gray-500 hover:underline">Clear</button>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {tables.map((t) => (
          <div key={t._id} className={`bg-white rounded-xl shadow-card p-3 text-center relative ${selected.has(t._id) ? 'ring-2 ring-brand-500' : ''}`}>
            <input
              type="checkbox" checked={selected.has(t._id)} onChange={() => toggleSelect(t._id)}
              className="absolute top-2 left-2 w-4 h-4 cursor-pointer" aria-label={`Select table ${t.tableNumber}`}
            />
            {/* The table number is always clickable — even if its QR is missing
                (e.g. after removing/regenerating) — and opens the table popup. */}
            <button onClick={() => setOpenTable(t)} className="font-semibold text-ink-900 mb-2 hover:text-brand-600 hover:underline px-2">
              Table {t.tableNumber}
            </button>
            {t.qrCodeUrl ? (
              <button onClick={() => setOpenTable(t)} className="block w-full">
                <img src={t.qrCodeUrl} alt={`QR ${t.tableNumber}`} className="w-full aspect-square object-contain mb-2" />
              </button>
            ) : (
              <div className="w-full aspect-square bg-gray-50 rounded flex items-center justify-center text-xs text-gray-400 mb-2">No QR yet</div>
            )}
            <div className="flex flex-col gap-1 text-xs">
              {t.qrCodeUrl && <button onClick={() => printOne(t)} className="text-brand-600 font-medium hover:underline">🖨️ Print</button>}
              <button onClick={() => regenerate(t._id)} className="text-brand-600 font-medium hover:underline">🔄 {t.qrCodeUrl ? 'Regenerate' : 'Generate QR'}</button>
              <button onClick={() => removeTable(t._id)} className="text-red-500 font-medium hover:underline">Remove</button>
            </div>
          </div>
        ))}
        {tables.length === 0 && <p className="text-gray-400 col-span-full text-center py-8">No tables yet — add one above.</p>}
      </div>

      {openTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setOpenTable(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-ink-900 text-lg">Table {openTable.tableNumber}</h3>
              <button onClick={() => setOpenTable(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            {openTable.qrCodeUrl ? (
              <img src={openTable.qrCodeUrl} alt="QR" className="w-56 h-56 object-contain mx-auto mb-3" />
            ) : (
              <p className="text-sm text-gray-400 py-10">No QR generated for this table yet.</p>
            )}
            <div className="flex gap-2 justify-center flex-wrap">
              {openTable.qrCodeUrl && <button onClick={() => printOne(openTable)} className="bg-brand-600 text-white text-sm px-3 py-2 rounded-lg">🖨️ Print</button>}
              <button onClick={() => regenerate(openTable._id)} className="bg-gray-100 text-gray-700 text-sm px-3 py-2 rounded-lg">🔄 {openTable.qrCodeUrl ? 'Regenerate' : 'Generate'}</button>
              <button onClick={() => removeTable(openTable._id)} className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
