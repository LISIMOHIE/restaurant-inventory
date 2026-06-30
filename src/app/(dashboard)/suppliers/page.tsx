'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Supplier } from '@/types';
import { Plus, Search, Pencil, X } from 'lucide-react';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '', name_ar: '', contact_person: '', phone: '', email: '', address: '', payment_terms: '', is_active: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('suppliers').select('*').order('name');
    if (search) q = q.ilike('name', `%${search}%`);
    const { data } = await q;
    setSuppliers((data || []) as Supplier[]);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', name_ar: '', contact_person: '', phone: '', email: '', address: '', payment_terms: '', is_active: true });
    setShowModal(true);
    setError('');
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ name: s.name, name_ar: s.name_ar || '', contact_person: s.contact_person || '', phone: s.phone || '', email: s.email || '', address: s.address || '', payment_terms: s.payment_terms || '', is_active: s.is_active });
    setShowModal(true);
    setError('');
  };

  const save = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    const payload = { name: form.name, name_ar: form.name_ar || null, contact_person: form.contact_person || null, phone: form.phone || null, email: form.email || null, address: form.address || null, payment_terms: form.payment_terms || null, is_active: form.is_active };
    const op = editing ? supabase.from('suppliers').update(payload).eq('id', editing.id) : supabase.from('suppliers').insert(payload);
    const { error: err } = await op;
    if (err) { setError(err.message); setSaving(false); return; }
    setShowModal(false);
    load();
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Suppliers</h2>
          <p className="text-sm text-slate-500">{suppliers.length} suppliers</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" />Add Supplier</button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-full sm:w-80" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-8 text-slate-400">Loading...</div>
        ) : suppliers.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold text-slate-900">{s.name}</div>
                {s.name_ar && <div className="text-sm text-slate-500 font-arabic" dir="rtl">{s.name_ar}</div>}
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
                <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="space-y-1 text-sm text-slate-600">
              {s.contact_person && <div>Contact: {s.contact_person}</div>}
              {s.phone && <div>Phone: {s.phone}</div>}
              {s.email && <div>Email: {s.email}</div>}
              {s.payment_terms && <div className="text-xs text-slate-400 mt-2">{s.payment_terms}</div>}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">{editing ? 'Edit Supplier' : 'Add Supplier'}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              {error && <div className="text-red-600 text-sm bg-red-50 rounded-lg p-3">{error}</div>}
              <div>
                <label className="label">Name (English) *</label>
                <input className="input w-full" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Name (Arabic)</label>
                <input className="input w-full text-right" dir="rtl" value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Contact Person</label>
                  <input className="input w-full" value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input w-full" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input w-full" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Address</label>
                <input className="input w-full" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <label className="label">Payment Terms</label>
                <input className="input w-full" value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} placeholder="e.g. Net 30, COD" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="sup_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
                <label htmlFor="sup_active" className="text-sm text-slate-700">Active</label>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
