'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PurchaseOrder, Supplier, Branch, Product } from '@/types';
import { Plus, Search, Eye, CheckCircle, X, Trash2, Download } from 'lucide-react';
import { exportPurchaseOrdersToExcel, downloadBlob } from '@/lib/excel';

type POStatus = 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled';

const STATUS_STYLES: Record<POStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  ordered: 'bg-blue-100 text-blue-700',
  partial: 'bg-amber-100 text-amber-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    supplier_id: '', branch_id: '', order_date: new Date().toISOString().slice(0, 10),
    expected_date: '', notes: '',
  });
  const [items, setItems] = useState<{ product_id: string; quantity_ordered: string; unit_cost: string; notes: string }[]>([
    { product_id: '', quantity_ordered: '1', unit_cost: '', notes: '' }
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('purchase_orders')
      .select('*, supplier:suppliers(*), branch:branches(*), items:purchase_order_items(*, product:products(*))')
      .order('created_at', { ascending: false });
    if (search) q = q.ilike('po_number', `%${search}%`);
    if (statusFilter) q = q.eq('status', statusFilter);
    const { data } = await q;
    setOrders((data || []) as PurchaseOrder[]);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    supabase.from('suppliers').select('*').eq('is_active', true).order('name').then(({ data }) => setSuppliers((data || []) as Supplier[]));
    supabase.from('branches').select('*').eq('is_active', true).order('name').then(({ data }) => setBranches((data || []) as Branch[]));
    supabase.from('products').select('*, supplier:suppliers(*)').eq('is_active', true).order('name').then(({ data }) => setProducts((data || []) as Product[]));
  }, []);

  const addItem = () => setItems(i => [...i, { product_id: '', quantity_ordered: '1', unit_cost: '', notes: '' }]);
  const removeItem = (idx: number) => setItems(i => i.filter((_, j) => j !== idx));
  const updateItem = (idx: number, field: string, value: string) => {
    setItems(items => {
      const updated = [...items];
      updated[idx] = { ...updated[idx], [field]: value };
      // Auto-fill cost from product price
      if (field === 'product_id') {
        const p = products.find(p => p.id === value);
        if (p) updated[idx].unit_cost = String(p.price);
      }
      return updated;
    });
  };

  const createOrder = async () => {
    if (!form.supplier_id || !form.branch_id) { setError('Supplier and branch are required'); return; }
    const validItems = items.filter(i => i.product_id);
    if (validItems.length === 0) { setError('Add at least one product'); return; }

    setSaving(true);
    setError('');

    const { data: { session } } = await supabase.auth.getSession();

    const { data: po, error: poErr } = await supabase.from('purchase_orders').insert({
      supplier_id: form.supplier_id, branch_id: form.branch_id,
      order_date: form.order_date, expected_date: form.expected_date || null,
      notes: form.notes || null, created_by: session?.user.id,
    }).select().single();

    if (poErr) { setError(poErr.message); setSaving(false); return; }

    const { error: itemErr } = await supabase.from('purchase_order_items').insert(
      validItems.map(i => ({
        purchase_order_id: po.id,
        product_id: i.product_id,
        quantity_ordered: parseFloat(i.quantity_ordered),
        unit_cost: parseFloat(i.unit_cost) || 0,
      }))
    );

    if (itemErr) { setError(itemErr.message); setSaving(false); return; }

    setShowCreateModal(false);
    setItems([{ product_id: '', quantity_ordered: '1', unit_cost: '', notes: '' }]);
    setForm({ supplier_id: '', branch_id: '', order_date: new Date().toISOString().slice(0, 10), expected_date: '', notes: '' });
    load();
    setSaving(false);
  };

  const updateStatus = async (id: string, status: POStatus) => {
    await supabase.from('purchase_orders').update({ status, ...(status === 'received' ? { received_date: new Date().toISOString().slice(0, 10) } : {}) }).eq('id', id);

    // If marking as received, update inventory
    if (status === 'received') {
      const order = orders.find(o => o.id === id);
      if (order?.items && order.branch_id) {
        const { data: { session } } = await supabase.auth.getSession();
        for (const item of order.items) {
          // Upsert inventory
          await supabase.from('inventory').upsert({ product_id: item.product_id, branch_id: order.branch_id, quantity: item.quantity_ordered }, { onConflict: 'product_id,branch_id', ignoreDuplicates: false });
          // Add transaction
          await supabase.from('inventory_transactions').insert({
            product_id: item.product_id, branch_id: order.branch_id,
            type: 'purchase', quantity: item.quantity_ordered,
            unit_cost: item.unit_cost, total_cost: item.total_cost,
            reference_id: id, performed_by: session?.user.id,
          });
        }
      }
    }

    load();
  };

  const handleExport = async () => {
    const buf = exportPurchaseOrdersToExcel(orders);
    downloadBlob(buf, `purchase-orders_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Purchase Orders</h2>
          <p className="text-sm text-slate-500">{orders.length} orders</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary"><Download className="w-4 h-4" /><span className="hidden sm:inline">Export</span></button>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary"><Plus className="w-4 h-4" />New Order</button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search by PO number..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-full" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input sm:w-44">
          <option value="">All Statuses</option>
          {['draft', 'ordered', 'partial', 'received', 'cancelled'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="th">PO Number</th>
                <th className="th">Supplier</th>
                <th className="th hidden md:table-cell">Branch</th>
                <th className="th hidden lg:table-cell">Order Date</th>
                <th className="th text-right">Total</th>
                <th className="th text-center">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-400">Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-400">No orders found</td></tr>
              ) : orders.map(po => (
                <tr key={po.id} className="hover:bg-slate-50 transition">
                  <td className="td font-mono font-medium text-indigo-700">{po.po_number}</td>
                  <td className="td text-slate-900">{po.supplier?.name}</td>
                  <td className="td hidden md:table-cell text-slate-600">{po.branch?.name}</td>
                  <td className="td hidden lg:table-cell text-slate-600">{po.order_date}</td>
                  <td className="td text-right font-semibold">EGP {po.total_amount.toLocaleString()}</td>
                  <td className="td text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[po.status as POStatus] || ''}`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="td text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setViewingOrder(po)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition" title="View">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {po.status === 'draft' && (
                        <button onClick={() => updateStatus(po.id, 'ordered')} className="p-1.5 hover:bg-blue-50 rounded text-slate-400 hover:text-blue-600 transition" title="Mark Ordered">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {po.status === 'ordered' && (
                        <button onClick={() => updateStatus(po.id, 'received')} className="p-1.5 hover:bg-green-50 rounded text-slate-400 hover:text-green-600 transition" title="Mark Received">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-slate-900">New Purchase Order</h3>
              <button onClick={() => setShowCreateModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              {error && <div className="text-red-600 text-sm bg-red-50 rounded-lg p-3">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Supplier *</label>
                  <select className="input w-full" value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                    <option value="">Select supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Branch *</label>
                  <select className="input w-full" value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}>
                    <option value="">Select branch</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Order Date</label>
                  <input type="date" className="input w-full" value={form.order_date} onChange={e => setForm(f => ({ ...f, order_date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Expected Date</label>
                  <input type="date" className="input w-full" value={form.expected_date} onChange={e => setForm(f => ({ ...f, expected_date: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="label">Notes</label>
                  <input className="input w-full" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Order Items</label>
                  <button onClick={addItem} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">+ Add Item</button>
                </div>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        className="input flex-1 min-w-0"
                        value={item.product_id}
                        onChange={e => updateItem(idx, 'product_id', e.target.value)}
                      >
                        <option value="">Select product</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                      </select>
                      <input type="number" min="0.001" step="0.001" placeholder="Qty" className="input w-20" value={item.quantity_ordered} onChange={e => updateItem(idx, 'quantity_ordered', e.target.value)} />
                      <input type="number" min="0" step="0.01" placeholder="Cost" className="input w-24" value={item.unit_cost} onChange={e => updateItem(idx, 'unit_cost', e.target.value)} />
                      {items.length > 1 && (
                        <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-right mt-2 text-sm font-semibold text-slate-700">
                  Total: EGP {items.reduce((s, i) => s + (parseFloat(i.quantity_ordered) || 0) * (parseFloat(i.unit_cost) || 0), 0).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={createOrder} disabled={saving} className="btn-primary flex-1">{saving ? 'Creating...' : 'Create Order'}</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="font-semibold text-slate-900">{viewingOrder.po_number}</h3>
                <p className="text-sm text-slate-500">{viewingOrder.supplier?.name} → {viewingOrder.branch?.name}</p>
              </div>
              <button onClick={() => setViewingOrder(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5">
              <div className="flex gap-4 mb-4 text-sm">
                <div><span className="text-slate-500">Status:</span> <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[viewingOrder.status as POStatus]}`}>{viewingOrder.status}</span></div>
                <div><span className="text-slate-500">Date:</span> {viewingOrder.order_date}</div>
                {viewingOrder.expected_date && <div><span className="text-slate-500">Expected:</span> {viewingOrder.expected_date}</div>}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="th">Product</th>
                    <th className="th text-right">Qty</th>
                    <th className="th text-right">Unit Cost</th>
                    <th className="th text-right">Total</th>
                    <th className="th text-center">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewingOrder.items?.map(item => (
                    <tr key={item.id}>
                      <td className="td">{item.product?.name}</td>
                      <td className="td text-right">{item.quantity_ordered}</td>
                      <td className="td text-right">EGP {item.unit_cost.toLocaleString()}</td>
                      <td className="td text-right font-medium">EGP {item.total_cost.toLocaleString()}</td>
                      <td className="td text-center">
                        <span className={`inline-flex w-2 h-2 rounded-full ${item.is_received ? 'bg-green-500' : 'bg-slate-300'}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200">
                    <td colSpan={3} className="td text-right font-bold">Total</td>
                    <td className="td text-right font-bold text-indigo-700">EGP {viewingOrder.total_amount.toLocaleString()}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
