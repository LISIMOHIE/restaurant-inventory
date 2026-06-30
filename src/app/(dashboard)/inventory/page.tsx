'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Branch, Product } from '@/types';
import { Search, AlertTriangle, Download, Edit2, X } from 'lucide-react';
import { downloadBlob } from '@/lib/excel';
import * as XLSX from 'xlsx';

type EditTarget = { product: Product; currentStock: number; reorderLevel: number };

export default function InventoryPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [branchError, setBranchError] = useState('');

  // Edit modal state
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editStock, setEditStock] = useState('');
  const [editReorder, setEditReorder] = useState('');
  const [saving, setSaving] = useState(false);

  // Load branches once
  useEffect(() => {
    supabase.from('branches').select('*').order('name').then(({ data, error }) => {
      if (error) setBranchError(`Error: ${error.message}`);
      else if (!data || data.length === 0) setBranchError('No branches returned from database');
      else setBranchError('');
      const list = (data || []) as Branch[];
      setBranches(list);
      if (list.length > 0) setSelectedBranch(list[0].id);
    });
  }, []);

  // Load all products once
  useEffect(() => {
    supabase
      .from('products')
      .select('*, category:categories(*), supplier:suppliers(*)')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setProducts((data || []) as Product[]));
  }, []);

  // Load inventory for selected branch
  const loadInventory = useCallback(async () => {
    if (!selectedBranch) return;
    setLoading(true);
    const { data } = await supabase
      .from('inventory')
      .select('product_id, quantity')
      .eq('branch_id', selectedBranch);
    const map: Record<string, number> = {};
    (data || []).forEach((i: { product_id: string; quantity: number }) => {
      map[i.product_id] = i.quantity;
    });
    setInventory(map);
    setLoading(false);
  }, [selectedBranch]);

  useEffect(() => { loadInventory(); }, [loadInventory]);

  const categories = Array.from(new Map(
    products.map(p => [(p.category as { id: string; name: string })?.id, (p.category as { id: string; name: string })?.name])
  ).entries()).filter(([id]) => id).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));

  const visibleProducts = products.filter(p => {
    const inBranch = Object.prototype.hasOwnProperty.call(inventory, p.id);
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.name_ar?.includes(search);
    const matchesCategory = !selectedCategory || (p.category as { id: string })?.id === selectedCategory;
    const matchesLow = !showLowOnly || (p.reorder_level > 0 && (inventory[p.id] ?? 0) <= p.reorder_level);
    return inBranch && matchesSearch && matchesCategory && matchesLow;
  });

  const lowStockCount = visibleProducts.filter(p => {
    const qty = inventory[p.id] ?? 0;
    return p.reorder_level > 0 && qty <= p.reorder_level;
  }).length;

  const openEdit = (p: Product) => {
    setEditTarget({ product: p, currentStock: inventory[p.id] ?? 0, reorderLevel: p.reorder_level });
    setEditStock(String(inventory[p.id] ?? 0));
    setEditReorder(String(p.reorder_level));
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const newStock = parseFloat(editStock);
    const newReorder = parseFloat(editReorder);
    const diff = newStock - editTarget.currentStock;

    // Update inventory quantity
    await supabase.from('inventory').upsert(
      { product_id: editTarget.product.id, branch_id: selectedBranch, quantity: newStock, last_counted_at: new Date().toISOString(), last_counted_by: session?.user.id },
      { onConflict: 'product_id,branch_id' }
    );

    // Log adjustment if stock changed
    if (diff !== 0) {
      await supabase.from('inventory_transactions').insert({
        product_id: editTarget.product.id,
        branch_id: selectedBranch,
        type: 'adjustment',
        quantity: Math.abs(diff),
        notes: `Manual stock set to ${newStock}`,
        performed_by: session?.user.id,
      });
    }

    // Update reorder level on product
    if (newReorder !== editTarget.reorderLevel) {
      await supabase.from('products').update({ reorder_level: newReorder }).eq('id', editTarget.product.id);
      setProducts(prev => prev.map(p => p.id === editTarget.product.id ? { ...p, reorder_level: newReorder } : p));
    }

    setInventory(prev => ({ ...prev, [editTarget.product.id]: newStock }));
    setEditTarget(null);
    setSaving(false);
  };

  const handleExport = () => {
    const branch = branches.find(b => b.id === selectedBranch);
    const rows = visibleProducts.map(p => {
      const qty = inventory[p.id] ?? 0;
      const toOrder = p.reorder_level > 0 && qty < p.reorder_level ? p.reorder_level - qty : 0;
      return {
        Product: p.name,
        'Arabic Name': p.name_ar || '',
        Category: (p.category as { name?: string })?.name || '',
        Unit: p.unit,
        'Current Stock': qty,
        'Reorder Level': p.reorder_level,
        'To Order': toOrder,
        'Value (EGP)': qty * p.price,
        Status: p.reorder_level > 0 && qty <= p.reorder_level ? 'LOW' : 'OK',
      };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Stock');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    downloadBlob(buf, `stock_${branch?.name || 'branch'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Inventory</h2>
          {lowStockCount > 0 && (
            <p className="text-sm text-red-600 mt-0.5 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {lowStockCount} item{lowStockCount > 1 ? 's' : ''} below reorder level
            </p>
          )}
        </div>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {branchError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{branchError}</div>
      )}

      {/* Branch Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit flex-wrap">
        {branches.map(b => (
          <button
            key={b.id}
            onClick={() => setSelectedBranch(b.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              selectedBranch === b.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9 w-full sm:w-72"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="input sm:w-48"
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button
          onClick={() => setShowLowOnly(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition ${
            showLowOnly
              ? 'bg-red-50 border-red-300 text-red-700'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Low Stock Only
        </button>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="th">Product</th>
                <th className="th hidden lg:table-cell">Category</th>
                <th className="th">Unit</th>
                <th className="th text-right">Current Stock</th>
                <th className="th text-right hidden md:table-cell">Reorder Level</th>
                <th className="th text-right hidden md:table-cell">To Order</th>
                <th className="th text-right hidden md:table-cell">Stock Value</th>
                <th className="th text-center">Status</th>
                <th className="th text-center">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10 text-slate-400">Loading...</td></tr>
              ) : visibleProducts.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400">
                  {search ? `No results for "${search}"` : 'No products found.'}
                </td></tr>
              ) : visibleProducts.map(p => {
                const qty = inventory[p.id] ?? 0;
                const isLow = p.reorder_level > 0 && qty <= p.reorder_level;
                const toOrder = p.reorder_level > 0 && qty < p.reorder_level ? p.reorder_level - qty : 0;
                const value = qty * p.price;
                return (
                  <tr key={p.id} className={`hover:bg-slate-50 transition ${isLow ? 'bg-red-50/30' : ''}`}>
                    <td className="td">
                      <div className="font-medium text-slate-900">{p.name}</div>
                      {p.name_ar && <div className="text-xs text-slate-400">{p.name_ar}</div>}
                    </td>
                    <td className="td hidden lg:table-cell">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        {(p.category as { name?: string })?.name}
                      </span>
                    </td>
                    <td className="td text-slate-600">{p.unit}</td>
                    <td className={`td text-right font-semibold ${isLow ? 'text-red-600' : 'text-slate-900'}`}>{qty}</td>
                    <td className="td text-right hidden md:table-cell text-slate-500">
                      {p.reorder_level > 0 ? p.reorder_level : '—'}
                    </td>
                    <td className="td text-right hidden md:table-cell">
                      {toOrder > 0
                        ? <span className="font-semibold text-orange-600">{toOrder}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="td text-right hidden md:table-cell text-slate-600">
                      {value > 0 ? `EGP ${value.toLocaleString()}` : '—'}
                    </td>
                    <td className="td text-center">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <AlertTriangle className="w-3 h-3" /> Low
                        </span>
                      ) : qty === 0 ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">Empty</span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">OK</span>
                      )}
                    </td>
                    <td className="td text-center">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        title="Edit stock & reorder level"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-slate-900">Edit Inventory</h3>
              <button onClick={() => setEditTarget(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="font-medium text-slate-900">{editTarget.product.name}</div>
                {editTarget.product.name_ar && <div className="text-sm text-slate-400">{editTarget.product.name_ar}</div>}
              </div>
              <div>
                <label className="label">Current Stock ({editTarget.product.unit})</label>
                <input
                  autoFocus
                  type="number" min="0" step="0.001"
                  className="input w-full"
                  value={editStock}
                  onChange={e => setEditStock(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Reorder Level ({editTarget.product.unit})</label>
                <input
                  type="number" min="0" step="0.001"
                  className="input w-full"
                  value={editReorder}
                  onChange={e => setEditReorder(e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">Alert will trigger when stock falls to or below this level.</p>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setEditTarget(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={saveEdit} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
