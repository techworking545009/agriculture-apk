import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, X, DollarSign, Loader2, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';

const CATEGORIES = ['Seeds', 'Fertilizer', 'Pesticides', 'Labor', 'Equipment', 'Irrigation', 'Transport', 'Other'];

const DEFAULT_FORM = { category: 'Seeds', amount: '', description: '', date: new Date().toISOString().split('T')[0], cropId: '' };

export default function Expenses() {
  const { t, isRTL, formatCurrency, settings } = useApp();
  const [expenses, setExpenses] = useState([]);
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
      const [expSnap, cropSnap] = await Promise.all([
        getDocs(query(collection(db, 'expenses'), where('userId', '==', uid))),
        getDocs(query(collection(db, 'crops'), where('userId', '==', uid))),
      ]);
      const exp = expSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setExpenses(exp);
      setCrops(cropSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!auth.currentUser || settings.readOnlyMode) {
      toast.error(settings.readOnlyMode ? 'Read-Only mode' : 'Not authenticated');
      return;
    }
    if (!form.amount || isNaN(Number(form.amount))) {
      toast.error('Please enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        userId: auth.currentUser.uid,
        updatedAt: new Date().toISOString(),
      };
      if (editId) {
        await updateDoc(doc(db, 'expenses', editId), payload);
        toast.success('Expense updated!');
      } else {
        payload.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'expenses'), payload);
        toast.success('Expense added!');
      }
      setShowForm(false);
      setEditId(null);
      setForm(DEFAULT_FORM);
      await fetchAll();
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (settings.readOnlyMode) { toast.error('Read-Only mode'); return; }
    try {
      await deleteDoc(doc(db, 'expenses', id));
      toast.success('Expense deleted');
      setDeleteConfirm(null);
      await fetchAll();
    } catch { toast.error('Delete failed'); }
  };

  const handleEdit = (exp) => {
    setForm({
      category: exp.category || 'Other',
      amount: String(exp.amount || ''),
      description: exp.description || '',
      date: exp.date || new Date().toISOString().split('T')[0],
      cropId: exp.cropId || '',
    });
    setEditId(exp.id);
    setShowForm(true);
  };

  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900">{t('expenses')}</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {isRTL ? 'کل:' : 'Total:'} {settings.privacyMode ? '••••••' : formatCurrency(total)}
          </p>
        </div>
        <button
          onClick={() => { setEditId(null); setForm(DEFAULT_FORM); setShowForm(true); }}
          disabled={settings.readOnlyMode}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-bold disabled:opacity-50"
        >
          <Plus className="w-5 h-5" /> {t('addExpense')}
        </button>
      </div>

      {loading && <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>}

      {!loading && expenses.length === 0 && (
        <div className="bg-white rounded-3xl border border-stone-100 p-16 text-center">
          <DollarSign className="w-16 h-16 text-stone-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-stone-900 mb-2">{isRTL ? 'کوئی اخراجات نہیں' : 'No Expenses Yet'}</h3>
          <p className="text-stone-500 text-sm">{isRTL ? 'اپنے پہلے اخراجات شامل کریں' : 'Add your first expense to get started'}</p>
        </div>
      )}

      {!loading && expenses.length > 0 && (
        <div className="space-y-3">
          {expenses.map(exp => (
            <div key={exp.id} className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex items-center justify-between hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="font-bold text-stone-900">{exp.category}</p>
                  {exp.description && <p className="text-sm text-stone-500">{exp.description}</p>}
                  <p className="text-xs text-stone-400 mt-0.5">{exp.date}</p>
                  {exp.cropId && crops.find(c => c.id === exp.cropId) && (
                    <p className="text-xs text-emerald-600 font-medium mt-0.5">
                      🌱 {crops.find(c => c.id === exp.cropId)?.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-red-600">
                  {settings.privacyMode ? '••••' : `-${formatCurrency(exp.amount)}`}
                </span>
                {!settings.readOnlyMode && (
                  <>
                    <button onClick={() => handleEdit(exp)} className="p-2 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteConfirm(exp.id)} className="p-2 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50">
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
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-stone-900">{editId ? 'Edit Expense' : t('addExpense')}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-sm font-semibold text-stone-700 mb-1 block">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-stone-700 mb-1 block">Amount ({settings.currency})</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-stone-700 mb-1 block">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Optional description"
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-stone-700 mb-1 block">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
              {crops.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-stone-700 mb-1 block">Linked Crop ({t('optional')})</label>
                  <select
                    value={form.cropId}
                    onChange={(e) => setForm(p => ({ ...p, cropId: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                  >
                    <option value="">None</option>
                    {crops.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 border border-stone-200 rounded-xl font-bold text-stone-600">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
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
              <div>
                <h3 className="font-bold text-stone-900">Delete Expense?</h3>
                <p className="text-sm text-stone-500">This cannot be undone.</p>
              </div>
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
