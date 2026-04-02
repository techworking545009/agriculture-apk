import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '../firebase';
import {
  collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import {
  Plus, Search, Trash2, Edit2, X, Leaf, MapPin, Calendar,
  CheckCircle, AlertTriangle, Loader2
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const GROWTH_STAGES = ['Seedling', 'Vegetative', 'Flowering', 'Ripening', 'Harvested'];
const STAGE_PROGRESS = { Seedling: 20, Vegetative: 40, Flowering: 60, Ripening: 80, Harvested: 100 };

const DEFAULT_FORM = {
  name: '', type: '', plantedDate: '', expectedHarvestDate: '',
  location: '', notes: '', status: 'growing', growthStage: 'Seedling',
  stockLevel: 0, reorderPoint: 0, unit: 'kg',
};

export default function Crops() {
  const { t, isRTL, settings } = useApp();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [selected, setSelected] = useState(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const fetchingRef = useRef(false);

  const fetchCrops = useCallback(async () => {
    if (!auth.currentUser || fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const q = query(collection(db, 'crops'), where('userId', '==', auth.currentUser.uid));
      const snap = await getDocs(q);
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setCrops(data);
    } catch (err) {
      toast.error('Failed to fetch crops');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []); // Stable - no deps that change

  useEffect(() => {
    fetchCrops();
  }, [fetchCrops]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    if (settings.readOnlyMode) { toast.error('App is in Read-Only mode'); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        userId: auth.currentUser.uid,
        updatedAt: new Date().toISOString(),
      };
      if (editId) {
        await updateDoc(doc(db, 'crops', editId), payload);
        toast.success('Crop updated successfully!');
      } else {
        payload.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'crops'), payload);
        toast.success('Crop added successfully!');
      }
      setShowForm(false);
      setEditId(null);
      setForm(DEFAULT_FORM);
      await fetchCrops();
    } catch (err) {
      toast.error('Failed to save crop: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (settings.readOnlyMode) { toast.error('App is in Read-Only mode'); return; }
    try {
      await deleteDoc(doc(db, 'crops', id));
      toast.success('Crop deleted');
      setDeleteConfirm(null);
      await fetchCrops();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleBulkDelete = async () => {
    if (settings.readOnlyMode || selected.size === 0) return;
    try {
      await Promise.all([...selected].map(id => deleteDoc(doc(db, 'crops', id))));
      toast.success(`${selected.size} crops deleted`);
      setSelected(new Set());
      await fetchCrops();
    } catch { toast.error('Bulk delete failed'); }
  };

  const handleEdit = (crop) => {
    setForm({
      name: crop.name || '',
      type: crop.type || '',
      plantedDate: crop.plantedDate || '',
      expectedHarvestDate: crop.expectedHarvestDate || '',
      location: crop.location || '',
      notes: crop.notes || '',
      status: crop.status || 'growing',
      growthStage: crop.growthStage || 'Seedling',
      stockLevel: crop.stockLevel || 0,
      reorderPoint: crop.reorderPoint || 0,
      unit: crop.unit || 'kg',
    });
    setEditId(crop.id);
    setShowForm(true);
  };

  const handleStageChange = async (cropId, stage) => {
    if (settings.readOnlyMode) return;
    try {
      await updateDoc(doc(db, 'crops', cropId), { growthStage: stage });
      toast.success(`Updated to ${stage}`);
      setCrops(prev => prev.map(c => c.id === cropId ? { ...c, growthStage: stage } : c));
    } catch { toast.error('Update failed'); }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = crops.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.type?.toLowerCase().includes(search.toLowerCase())
  );

  const openAddForm = () => {
    setEditId(null);
    setForm(DEFAULT_FORM);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute top-1/2 -translate-y-1/2 left-3 text-stone-400 w-5 h-5" />
          <input
            type="text"
            placeholder={isRTL ? 'فصلیں تلاش کریں...' : 'Search crops...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 font-bold text-sm"
            >
              <Trash2 className="w-4 h-4" />
              {isRTL ? `حذف (${selected.size})` : `Delete (${selected.size})`}
            </button>
          )}
          <button
            onClick={openAddForm}
            disabled={settings.readOnlyMode}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold disabled:opacity-50 hover:from-emerald-700 hover:to-teal-700 transition-all"
          >
            <Plus className="w-5 h-5" />
            {isRTL ? 'فصل شامل کریں' : 'Add Crop'}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      )}

      {/* Crops Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(crop => {
            const progress = STAGE_PROGRESS[crop.growthStage] || 0;
            const isSelected = selected.has(crop.id);
            const isLowStock = crop.stockLevel !== undefined && crop.stockLevel <= (crop.reorderPoint || 0);

            return (
              <div
                key={crop.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-lg transition-all ${
                  isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-stone-100'
                }`}
              >
                {/* Card header */}
                <div className="relative bg-gradient-to-br from-emerald-50 to-stone-50 h-48">
                  {/* Checkbox */}
                  {!settings.readOnlyMode && (
                    <div className="absolute top-3 left-3 z-10">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(crop.id)}
                        className="w-5 h-5 rounded border-stone-300 text-emerald-600 cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Actions */}
                  {!settings.readOnlyMode && (
                    <div className="absolute top-3 right-3 flex gap-2 z-10">
                      <button
                        onClick={() => handleEdit(crop)}
                        className="p-2 bg-white text-stone-600 rounded-xl hover:bg-stone-100 shadow-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(crop.id)}
                        className="p-2 bg-white text-red-600 rounded-xl hover:bg-red-600 hover:text-white shadow-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Icon */}
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <Leaf className="w-16 h-16 text-emerald-300" />
                    <div className="text-xs font-bold text-stone-400 mt-2 uppercase tracking-wider">
                      {crop.type || 'Crop'}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="absolute bottom-3 left-3 flex flex-col gap-1">
                    <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full uppercase">
                      {crop.status}
                    </span>
                    <span className="px-2 py-0.5 bg-white/90 text-stone-700 text-[10px] font-bold rounded-full">
                      {crop.growthStage} • {progress}%
                    </span>
                    {isLowStock && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                        Low Stock
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Card body */}
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-stone-900">{crop.name}</h3>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mt-0.5">{crop.type}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm border-t border-stone-50 pt-3">
                    {crop.location && (
                      <div className="flex items-center gap-1.5 text-stone-500">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{crop.location}</span>
                      </div>
                    )}
                    {crop.plantedDate && (
                      <div className="flex items-center gap-1.5 text-stone-500">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{crop.plantedDate}</span>
                      </div>
                    )}
                    {crop.stockLevel !== undefined && (
                      <div className="col-span-2 flex items-center gap-1.5 text-stone-500">
                        <span className="text-xs">Stock: {crop.stockLevel} {crop.unit}</span>
                      </div>
                    )}
                  </div>

                  {/* Growth stage selector */}
                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 block">
                      Growth Stage
                    </label>
                    <select
                      disabled={settings.readOnlyMode}
                      value={crop.growthStage}
                      onChange={(e) => handleStageChange(crop.id, e.target.value)}
                      className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-sm font-bold text-stone-700 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer disabled:cursor-default"
                    >
                      {GROWTH_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {crop.notes && (
                    <p className="text-xs text-stone-500 italic bg-stone-50 p-3 rounded-xl border border-stone-100 line-clamp-2">
                      "{crop.notes}"
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="bg-white rounded-3xl border border-stone-100 p-16 text-center">
          <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <Leaf className="w-10 h-10 text-stone-200 animate-float" />
          </div>
          <h3 className="text-xl font-bold text-stone-900 mb-2">{t('noCropsFound')}</h3>
          <p className="text-stone-500 mb-6">{t('addFirstCrop')}</p>
          <button
            onClick={openAddForm}
            disabled={settings.readOnlyMode}
            className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-2xl hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50"
          >
            {isRTL ? 'اپنی پہلی فصل شامل کریں' : 'Add your first crop'}
          </button>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-stone-900">
                {editId ? t('editCropTitle') : t('addCropTitle')}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-stone-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'name', label: t('cropName'), required: true, type: 'text', placeholder: 'e.g. Wheat' },
                  { key: 'type', label: t('cropType'), required: false, type: 'text', placeholder: 'e.g. Cereal' },
                  { key: 'location', label: 'Location', required: false, type: 'text', placeholder: 'Field A' },
                  { key: 'plantedDate', label: 'Planted Date', required: false, type: 'date' },
                  { key: 'expectedHarvestDate', label: 'Expected Harvest', required: false, type: 'date' },
                ].map(f => (
                  <div key={f.key} className={f.key === 'notes' ? 'col-span-2' : ''}>
                    <label className="text-sm font-semibold text-stone-700 mb-1 block">
                      {f.label} {!f.required && <span className="text-stone-400 font-normal">({t('optional')})</span>}
                    </label>
                    <input
                      type={f.type}
                      required={f.required}
                      value={form[f.key]}
                      onChange={(e) => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-sm font-semibold text-stone-700 mb-1 block">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Any notes about this crop..."
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm resize-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-stone-700 mb-1 block">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                  >
                    <option value="growing">Growing</option>
                    <option value="harvested">Harvested</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-stone-700 mb-1 block">Growth Stage</label>
                  <select
                    value={form.growthStage}
                    onChange={(e) => setForm(p => ({ ...p, growthStage: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                  >
                    {GROWTH_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-sm font-semibold text-stone-700 mb-1 block">
                    {t('stockLevel')}
                  </label>
                  <input
                    type="number"
                    value={form.stockLevel}
                    onChange={(e) => setForm(p => ({ ...p, stockLevel: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-stone-700 mb-1 block">Unit</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm(p => ({ ...p, unit: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                  >
                    {['kg', 'tons', 'units', 'bags'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 border border-stone-200 text-stone-600 rounded-xl font-bold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editId ? 'Update' : 'Add Crop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
              <div>
                <h3 className="font-bold text-stone-900">Delete Crop?</h3>
                <p className="text-sm text-stone-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-stone-200 rounded-xl font-bold text-stone-600">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
