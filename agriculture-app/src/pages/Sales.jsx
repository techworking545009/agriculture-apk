import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, X, TrendingUp, Loader2, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';

const DEFAULT_FORM = {
  cropName: '', cropId: '', quantity: '', unit: 'kg', pricePerUnit: '',
  totalAmount: '', date: new Date().toISOString().split('T')[0],
  buyer: '', status: 'sold', notes: '',
};

export default function Sales() {
  const { t, isRTL, formatCurrency, settings } = useApp();
  const [sales, setSales] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const fetchingRef = useRef(false);

  const fetchAll = useCallback(async () => {
    if (!auth.currentUser || fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const uid = auth.currentUser.uid;
      const [salesSnap, cropsSnap] = await Promise.all([
        getDocs(query(collection(db, 'sales'), where('userId', '==', uid))),
        getDocs(query(collection(db, 'crops'), where('userId', '==', uid))),
      ]);
      const s = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setSales(s);
      setCrops(cropsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch { toast.error('Failed to load sales'); }
    finally { setLoading(false); fetchingRef.current = false; }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-calc total amount when qty or price changes
  useEffect(() => {
    const qty = parseFloat(form.quantity) || 0;
    const price = parseFloat(form.pricePerUnit) || 0;
    if (qty > 0 && price > 0) {
      setForm(prev => ({ ...prev, totalAmount: String(qty * price) }));
    }
  }, [form.quantity, form.pricePerUnit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!auth.currentUser || settings.readOnlyMode) {
      toast.error(settings.readOnlyMode ? 'Read-Only mode' : 'Not authenticated');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity) || 0,
        pricePerUnit: Number(form.pricePerUnit) || 0,
        totalAmount: Number(form.totalAmount) || 0,
        userId: auth.currentUser.uid,
        updatedAt: new Date().toISOString(),
      };
      if (editId) {
        await updateDoc(doc(db, 'sales', editId), payload);
        toast.success('Sale updated!');
      } else {
        payload.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'sales'), payload);
        toast.success('Sale added!');
      }
      setShowForm(false);
      setEditId(null);
      setForm(DEFAULT_FORM);
      await fetchAll();
    } catch (err) { toast.error('Failed to save: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (settings.readOnlyMode) { toast.error('Read-Only mode'); return; }
    try {
      await deleteDoc(doc(db, 'sales', id));
      toast.success('Sale deleted');
      setDeleteConfirm(null);
      await fetchAll();
    } catch { toast.error('Delete failed'); }
  };

  const handleEdit = (sale) => {
    setForm({
      cropName: sale.cropName || '',
      cropId: sale.cropId || '',
      quantity: String(sale.quantity || ''),
      unit: sale.unit || 'kg',
      pricePerUnit: String(sale.pricePerUnit || ''),
      totalAmount: String(sale.totalAmount || ''),
      date: sale.date || new Date().toISOString().split('T')[0],
      buyer: sale.buyer || '',
      status: sale.status || 'sold',
      notes: sale.notes || '',
    });
    setEditId(sale.id);
    setShowForm(true);
  };

  const handleCropSelect = (cropId) => {
    const crop = crops.find(c => c.id === cropId);
    setForm(prev => ({
      ...prev,
      cropId,
      cropName: crop?.name || prev.cropName,
    }));
  };

  const total = sales.reduce((sum, s) => sum + (s.status === 'sold' ? (s.totalAmount || 0) : 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900">{t('sales')}</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {isRTL ? 'کل فروخت:' : 'Total Revenue:'} {settings.privacyMode ? '••••••' : formatCurrency(total)}
          </p>
        </div>
        <button
          onClick={() => { setEditId(null); setForm(DEFAULT_FORM); setShowForm(true); }}
          disabled={settings.readOnlyMode}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold disabled:opacity-50"
        >
          <Plus className="w-5 h-5" /> {t('addSale')}
        </button>
      </div>

      {loading && <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>}

      {!loading && sales.length === 0 && (
        <div className="bg-white rounded-3xl border border-stone-100 p-16 text-center">
          <TrendingUp className="w-16 h-16 text-stone-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-stone-900 mb-2">{isRTL ? 'کوئی فروخت نہیں' : 'No Sales Yet'}</h3>
          <p className="text-stone-500 text-sm">{isRTL ? 'اپنی پہلی فروخت شامل کریں' : 'Add your first sale to get started'}</p>
        </div>
      )}

      {!loading && sales.length > 0 && (
        <div className="space-y-3">
          {sales.map(sale => (
            <div key={sale.id} className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex items-center justify-between hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${sale.status === 'sold' ? 'bg-emerald-50' : 'bg-stone-50'}`}>
                  <TrendingUp className={`w-5 h-5 ${sale.status === 'sold' ? 'text-emerald-500' : 'text-stone-400'}`} />
                </div>
                <div>
                  <p className="font-bold text-stone-900">{sale.cropName}</p>
                  <p className="text-sm text-stone-500">
                    {sale.quantity} {sale.unit} @ {formatCurrency(sale.pricePerUnit)}/{sale.unit}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-stone-400">{sale.date}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      sale.status === 'sold' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'
                    }`}>{sale.status}</span>
                  </div>
                  {sale.buyer && <p className="text-xs text-stone-400">Buyer: {sale.buyer}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-bold ${sale.status === 'sold' ? 'text-emerald-600' : 'text-stone-500'}`}>
                  {settings.privacyMode ? '••••' : `+${formatCurrency(sale.totalAmount)}`}
                </span>
                {!settings.readOnlyMode && (
                  <>
                    <button onClick={() => handleEdit(sale)} className="p-2 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteConfirm(sale.id)} className="p-2 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold">{editId ? 'Edit Sale' : t('addSale')}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {crops.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-stone-700 mb-1 block">Linked Crop ({t('optional')})</label>
                  <select
                    value={form.cropId}
                    onChange={(e) => handleCropSelect(e.target.value)}
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                  >
                    <option value="">Select crop (optional)</option>
                    {crops.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-sm font-semibold text-stone-700 mb-1 block">Crop Name</label>
                <input
                  required
                  type="text"
                  value={form.cropName}
                  onChange={(e) => setForm(p => ({ ...p, cropName: e.target.value }))}
                  placeholder="e.g. Wheat"
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-stone-700 mb-1 block">Quantity</label>
                  <input
                    required type="number" min="0" step="0.01"
                    value={form.quantity}
                    onChange={(e) => setForm(p => ({ ...p, quantity: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-stone-700 mb-1 block">Unit</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm(p => ({ ...p, unit: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                  >
                    {['kg', 'tons', 'units', 'bags'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-stone-700 mb-1 block">Price/Unit ({settings.currency})</label>
                  <input
                    required type="number" min="0" step="0.01"
                    value={form.pricePerUnit}
                    onChange={(e) => setForm(p => ({ ...p, pricePerUnit: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-stone-700 mb-1 block">Total Amount</label>
                  <input
                    type="number" min="0"
                    value={form.totalAmount}
                    onChange={(e) => setForm(p => ({ ...p, totalAmount: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-stone-50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-stone-700 mb-1 block">Date</label>
                  <input
                    type="date" value={form.date}
                    onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-stone-700 mb-1 block">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                  >
                    <option value="sold">Sold</option>
                    <option value="stock">In Stock</option>
                    <option value="home">Home Use</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-stone-700 mb-1 block">Buyer ({t('optional')})</label>
                <input
                  type="text" value={form.buyer}
                  onChange={(e) => setForm(p => ({ ...p, buyer: e.target.value }))}
                  placeholder="Buyer name"
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 border border-stone-200 rounded-xl font-bold text-stone-600">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editId ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-7 h-7 text-red-500" />
              <div><h3 className="font-bold">Delete Sale?</h3><p className="text-sm text-stone-500">This cannot be undone.</p></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-stone-200 rounded-xl font-bold text-stone-600">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
