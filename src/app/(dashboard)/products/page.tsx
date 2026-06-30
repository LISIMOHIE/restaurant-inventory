'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, Category, Supplier } from '@/types';
import { Plus, Search, Download, Upload, Pencil, Trash2, X, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { downloadBlob, exportProductsToExcel, parseProductImport } from '@/lib/excel';

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  const [form, setForm] = useState({
    name: '', name_ar: '', sku: '', category_id: '', supplier_id: '',
    unit: '', unit_ar: '', price: '', reorder_level: '', notes: '', is_active: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('products')
      .select('*, category:categories(*), supplier:suppliers(*)', { count: 'exact' })
      .order('name')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search) q = q.ilike('name', `%${search}%`);
    if (catFilter) q = q.eq('category_id', catFilter);

    const { data, count } = await q;
    setProducts((data || []) as Product[]);
    setTotal(count || 0);
    setLoading(false);
  }, [page, search, catFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(({ data }) => setCategories((data || []) as Category[]));
    supabase.from('suppliers').select('*').eq('is_active', true).order('name').then(({ data }) => setSuppliers((data || []) as Supplier[]));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', name_ar: '', sku: '', category_id: '', supplier_id: '', unit: 'piece', unit_ar: '', price: '', reorder_level: '0', notes: '', is_active: true });
    setShowModal(true);
    setError('');
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, name_ar: p.name_ar || '', sku: p.sku || '',
      category_id: p.category_id || '', supplier_id: p.supplier_id || '',
      unit: p.unit, unit_ar: p.unit_ar || '', price: String(p.price),
      reorder_level: String(p.reorder_level), notes: p.notes || '', is_active: p.is_active,
    });
    setShowModal(true);
    setError('');
  };

  const save = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');

    const payload = {
      name: form.name.trim(),
      name_ar: form.name_ar || null,
      sku: form.sku || null,
      category_id: form.category_id || null,
      supplier_id: form.supplier_id || null,
      unit: form.unit,
      unit_ar: form.unit_ar || null,
      price: parseFloat(form.price) || 0,
      reorder_level: parseFloat(form.reorder_level) || 0,
      notes: form.notes || null,
      is_active: form.is_active,
    };

    const op = editing
      ? supabase.from('products').update(payload).eq('id', editing.id)
      : supabase.from('products').insert(payload).select().single();

    const { error: err } = await op;
    if (err) { setError(err.message); setSaving(false); return; }

    setShowModal(false);
    load();
    setSaving(false);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await supabase.from('products').update({ is_active: false }).eq('id', id);
    load();
  };

  const handleExport = async () => {
    const { data } = await supabase.from('products').select('*, category:categories(*), supplier:suppliers(*)').eq('is_active', true);
    const buf = exportProductsToExcel(data as Product[], []);
    downloadBlob(buf, `products_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg('');

    const buf = await file.arrayBuffer();
    const { rows, errors } = parseProductImport(buf);

    if (errors.length > 0) {
      setImportMsg(`Errors: ${errors.join('; ')}`);
      setImporting(false);
      return;
    }

    // Resolve category/supplier names to IDs
    let success = 0;
    for (const row of rows) {
      const catId = row.category ? categories.find(c => c.name.toLowerCase() === row.category?.toLowerCase())?.id : null;
      const supId = row.supplier ? suppliers.find(s => s.name.toLowerCase() === row.supplier?.toLowerCase())?.id : null;

      const { error } = await supabase.from('products').upsert({
        name: row.name, name_ar: row.name_ar, sku: row.sku,
        category_id: catId, supplier_id: supId,
        unit: row.unit, unit_ar: row.unit_ar, price: row.price,
        reorder_level: row.reorder_level || 0,
      }, { onConflict: 'sku', ignoreDuplicates: false });

      if (!error) success++;
    }

    setImportMsg(`Imported ${success}/${rows.length} products`);
    load();
    setImporting(false);
    e.target.value = '';
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Products</h2>
          <p className="text-sm text-slate-500">{total} items in catalog</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="btn-secondary cursor-pointer">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">{importing ? 'Importing...' : 'Import'}</span>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
          <button onClick={handleExport} className="btn-secondary">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {importMsg && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {importMsg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="input pl-9 w-full"
          />
        </div>
        <select
          value={catFilter}
          onChange={e => { setCatFilter(e.target.value); setPage(0); }}
          className="input sm:w-52"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="th">Product</th>
                <th className="th hidden md:table-cell">Arabic Name</th>
                <th className="th hidden lg:table-cell">Category</th>
                <th className="th hidden lg:table-cell">Supplier</th>
                <th className="th">Unit</th>
                <th className="th text-right">Price</th>
                <th className="th text-right hidden md:table-cell">Reorder</th>
                <th className="th text-center">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-slate-400">Loading...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-slate-400">No products found</td></tr>
              ) : products.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition">
                  <td className="td font-medium text-slate-900">
                    <div>{p.name}</div>
                    {p.sku && <div className="text-xs text-slate-400 font-mono">{p.sku}</div>}
                  </td>
                  <td className="td hidden md:table-cell text-slate-600 font-arabic">{p.name_ar || '—'}</td>
                  <td className="td hidden lg:table-cell">
                    {p.category && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        {p.category.name}
                      </span>
                    )}
                  </td>
                  <td className="td hidden lg:table-cell text-slate-600">{p.supplier?.name || '—'}</td>
                  <td className="td text-slate-600">{p.unit}</td>
                  <td className="td text-right font-semibold text-slate-900">
                    {p.price > 0 ? `EGP ${p.price.toLocaleString()}` : '—'}
                  </td>
                  <td className="td text-right hidden md:table-cell text-slate-600">{p.reorder_level}</td>
                  <td className="td text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="td text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteProduct(p.id)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-sm text-slate-500">Page {page + 1} of {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 transition">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 transition">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">{editing ? 'Edit Product' : 'Add Product'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {error && <div className="text-red-600 text-sm bg-red-50 rounded-lg p-3">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Name (English) *</label>
                  <input className="input w-full" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="label">Name (Arabic)</label>
                  <input className="input w-full text-right" dir="rtl" value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} />
                </div>
                <div>
                  <label className="label">SKU</label>
                  <input className="input w-full font-mono" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Unit</label>
                  <input className="input w-full" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="piece, kg, box..." />
                </div>
                <div>
                  <label className="label">Price (EGP)</label>
                  <input type="number" className="input w-full" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} min="0" step="0.01" />
                </div>
                <div>
                  <label className="label">Reorder Level</label>
                  <input type="number" className="input w-full" value={form.reorder_level} onChange={e => setForm(f => ({ ...f, reorder_level: e.target.value }))} min="0" />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select className="input w-full" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Supplier</label>
                  <select className="input w-full" value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                    <option value="">Select supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="label">Notes</label>
                  <textarea className="input w-full h-20 resize-none" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 rounded accent-indigo-600" />
                  <label htmlFor="is_active" className="text-sm text-slate-700">Active</label>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
