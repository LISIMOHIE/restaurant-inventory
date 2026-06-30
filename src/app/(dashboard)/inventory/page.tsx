'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Branch, Product, LowStockAlert } from '@/types';
import { Search, AlertTriangle, ArrowUpDown, Plus, X, Download } from 'lucide-react';
import { downloadBlob } from '@/lib/excel';
import * as XLSX from 'xlsx';

type Tab = 'stock' | 'alerts' | 'transactions';

const TXN_TYPES = ['adjustment', 'consumption', 'waste', 'transfer_in', 'transfer_out', 'return'];

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>('stock');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [transactions, setTransactions] = useState<unknown[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [txnForm, setTxnForm] = useState({
    product_id: '', type: 'adjustment', quantity: '', notes: '', unit_cost: '',
  });

  useEffect(() => {
    supabase.from('branches').select('*').eq('is_active', true).order('name').then(({ data }) => {
      setBranches((data || []) as Branch[]);
      if (data && data.length > 0) setSelectedBranch(data[0].id);
    });
  }, []);

  const loadInventory = useCallback(async () => {
    if (!selectedBranch) return;
    setLoading(true);

    const { data: invData } = await supabase
      .from('inventory')
      .select('product_id, quantity')
      .eq('branch_id', selectedBranch);

    const map: Record<string, number> = {};
    (invData || []).forEach((i: { product_id: string; quantity: number }) => { map[i.product_id] = i.quantity; });
    setInventory(map);

    let q = supabase.from('products').select('*, category:categories(*), supplier:suppliers(*)').eq('is_active', true).order('name');
    if (search) q = q.ilike('name', `%${search}%`);
    const { data: prodData } = await q;
    setProducts((prodData || []) as Product[]);

    setLoading(false);
  }, [selectedBranch, search]);

  useEffect(() => { if (tab === 'stock') loadInventory(); }, [tab, loadInventory]);

  const loadAlerts = useCallback(async () => {
    let q = supabase.from('low_stock_alerts').select('*');
    if (selectedBranch) q = q.eq('branch_id', selectedBranch);
    const { data } = await q;
    setAlerts((data || []) as LowStockAlert[]);
  }, [selectedBranch]);

  const loadTransactions = useCallback(async () => {
    let q = supabase
      .from('inventory_transactions')
      .select('*, product:products(name), branch:branches(name)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (selectedBranch) q = q.eq('branch_id', selectedBranch);
    const { data } = await q;
    setTransactions(data || []);
  }, [selectedBranch]);

  useEffect(() => {
    if (tab === 'alerts') loadAlerts();
    if (tab === 'transactions') loadTransactions();
  }, [tab, loadAlerts, loadTransactions]);

  const saveTransaction = async () => {
    if (!txnForm.product_id || !txnForm.type || !txnForm.quantity) { setError('Fill required fields'); return; }
    setSaving(true);
    setError('');

    const { data: { session } } = await supabase.auth.getSession();
    const qty = parseFloat(txnForm.quantity);
    const isNegative = ['consumption', 'waste', 'transfer_out'].includes(txnForm.type);
    const signedQty = isNegative ? -Math.abs(qty) : Math.abs(qty);

    // Update inventory
    const { data: inv } = await supabase.from('inventory').select('quantity').eq('product_id', txnForm.product_id).eq('branch_id', selectedBranch).single();
    const currentQty = inv?.quantity || 0;
    const newQty = currentQty + signedQty;

    await supabase.from('inventory').upsert(
      { product_id: txnForm.product_id, branch_id: selectedBranch, quantity: Math.max(0, newQty), last_counted_at: new Date().toISOString(), last_counted_by: session?.user.id },
      { onConflict: 'product_id,branch_id' }
    );

    // Log transaction
    await supabase.from('inventory_transactions').insert({
      product_id: txnForm.product_id,
      branch_id: selectedBranch,
      type: txnForm.type,
      quantity: Math.abs(qty),
      unit_cost: txnForm.unit_cost ? parseFloat(txnForm.unit_cost) : null,
      notes: txnForm.notes || null,
      performed_by: session?.user.id,
    });

    setShowTxnModal(false);
    setTxnForm({ product_id: '', type: 'adjustment', quantity: '', notes: '', unit_cost: '' });
    setSaving(false);
    loadInventory();
  };

  const handleExportStock = () => {
    const data = products.map(p => ({
      Name: p.name, 'Arabic Name': p.name_ar, Category: (p.category as { name?: string })?.name, Supplier: (p.supplier as { name?: string })?.name, Unit: p.unit, Price: p.price, 'Current Stock': inventory[p.id] ?? 0, 'Reorder Level': p.reorder_level, Status: (inventory[p.id] ?? 0) <= p.reorder_level && p.reorder_level > 0 ? 'LOW' : 'OK',
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    const branch = branches.find(b => b.id === selectedBranch);
    downloadBlob(buf, `inventory_${branch?.name || 'all'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'stock', label: 'Stock Levels' },
    { id: 'alerts', label: 'Low Stock Alerts', count: alerts.length },
    { id: 'transactions', label: 'Transactions' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">Inventory</h2>
        <div className="flex gap-2">
          <select className="input sm:w-48" value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button onClick={handleExportStock} className="btn-secondary"><Download className="w-4 h-4" /></button>
          <button onClick={() => setShowTxnModal(true)} className="btn-primary"><Plus className="w-4 h-4" />Record</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Stock Levels Tab */}
      {tab === 'stock' && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-full sm:w-80" />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="th">Product</th>
                    <th className="th hidden lg:table-cell">Category</th>
                    <th className="th">Unit</th>
                    <th className="th text-right">Price</th>
                    <th className="th text-right">Stock</th>
                    <th className="th text-right hidden md:table-cell">Reorder</th>
                    <th className="th text-right hidden md:table-cell">Value</th>
                    <th className="th text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={8} className="text-center py-8 text-slate-400">Loading...</td></tr>
                  ) : products.map(p => {
                    const qty = inventory[p.id] ?? 0;
                    const isLow = p.reorder_level > 0 && qty <= p.reorder_level;
                    const value = qty * p.price;
                    return (
                      <tr key={p.id} className={`hover:bg-slate-50 transition ${isLow ? 'bg-red-50/30' : ''}`}>
                        <td className="td">
                          <div className="font-medium text-slate-900">{p.name}</div>
                          {p.name_ar && <div className="text-xs text-slate-400">{p.name_ar}</div>}
                        </td>
                        <td className="td hidden lg:table-cell">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">{(p.category as { name?: string })?.name}</span>
                        </td>
                        <td className="td text-slate-600">{p.unit}</td>
                        <td className="td text-right text-slate-600">EGP {p.price}</td>
                        <td className={`td text-right font-semibold ${isLow ? 'text-red-600' : 'text-slate-900'}`}>{qty}</td>
                        <td className="td text-right hidden md:table-cell text-slate-500">{p.reorder_level}</td>
                        <td className="td text-right hidden md:table-cell text-slate-600">{value > 0 ? `EGP ${value.toLocaleString()}` : '—'}</td>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Alerts Tab */}
      {tab === 'alerts' && (
        <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
          {alerts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              No low stock alerts!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-red-50 border-b border-red-100">
                    <th className="th">Product</th>
                    <th className="th">Branch</th>
                    <th className="th">Category</th>
                    <th className="th">Supplier</th>
                    <th className="th text-right">Current</th>
                    <th className="th text-right">Min Level</th>
                    <th className="th text-right">Shortage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alerts.map((a, i) => (
                    <tr key={i} className="hover:bg-red-50/30 transition">
                      <td className="td font-medium text-slate-900">{a.name}</td>
                      <td className="td text-slate-600">{a.branch}</td>
                      <td className="td text-slate-600">{a.category}</td>
                      <td className="td text-slate-600">{a.supplier}</td>
                      <td className="td text-right text-red-600 font-semibold">{a.current_quantity} {a.unit}</td>
                      <td className="td text-right text-slate-500">{a.reorder_level}</td>
                      <td className="td text-right text-red-700 font-bold">{a.shortage?.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {tab === 'transactions' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="th">Date</th>
                  <th className="th">Product</th>
                  <th className="th hidden md:table-cell">Branch</th>
                  <th className="th">Type</th>
                  <th className="th text-right">Qty</th>
                  <th className="th text-right hidden lg:table-cell">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(transactions as { id: string; created_at: string; product: { name: string }; branch: { name: string }; type: string; quantity: number; unit_cost: number }[]).map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="td text-slate-500">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="td font-medium text-slate-900">{t.product?.name}</td>
                    <td className="td hidden md:table-cell text-slate-600">{t.branch?.name}</td>
                    <td className="td">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 capitalize">{t.type}</span>
                    </td>
                    <td className={`td text-right font-semibold ${['consumption', 'waste', 'transfer_out'].includes(t.type) ? 'text-red-600' : 'text-green-600'}`}>
                      {['consumption', 'waste', 'transfer_out'].includes(t.type) ? '-' : '+'}{t.quantity}
                    </td>
                    <td className="td text-right hidden lg:table-cell text-slate-500">
                      {t.unit_cost ? `EGP ${t.unit_cost}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTxnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2"><ArrowUpDown className="w-4 h-4" /> Record Transaction</h3>
              <button onClick={() => setShowTxnModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              {error && <div className="text-red-600 text-sm bg-red-50 rounded-lg p-3">{error}</div>}
              <div>
                <label className="label">Product *</label>
                <select className="input w-full" value={txnForm.product_id} onChange={e => setTxnForm(f => ({ ...f, product_id: e.target.value }))}>
                  <option value="">Select product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {inventory[p.id] ?? 0} {p.unit})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Type *</label>
                  <select className="input w-full" value={txnForm.type} onChange={e => setTxnForm(f => ({ ...f, type: e.target.value }))}>
                    {TXN_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Quantity *</label>
                  <input type="number" min="0.001" step="0.001" className="input w-full" value={txnForm.quantity} onChange={e => setTxnForm(f => ({ ...f, quantity: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Unit Cost (EGP)</label>
                <input type="number" min="0" step="0.01" className="input w-full" value={txnForm.unit_cost} onChange={e => setTxnForm(f => ({ ...f, unit_cost: e.target.value }))} placeholder="Optional" />
              </div>
              <div>
                <label className="label">Notes</label>
                <input className="input w-full" value={txnForm.notes} onChange={e => setTxnForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setShowTxnModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={saveTransaction} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Record'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
