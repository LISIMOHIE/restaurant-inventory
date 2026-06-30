'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, Package } from 'lucide-react';
import { downloadBlob, exportInventoryValuationToExcel } from '@/lib/excel';

interface ValuationRow {
  branch_id: string;
  branch: string;
  category: string;
  total_value: number;
  product_count: number;
  zero_stock_count: number;
  low_stock_count: number;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

export default function ReportsPage() {
  const [data, setData] = useState<ValuationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [txnStats, setTxnStats] = useState<{ type: string; count: number; total_qty: number }[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: val } = await supabase.from('inventory_valuation').select('*');
      setData((val || []) as ValuationRow[]);

      const { data: txns } = await supabase
        .from('inventory_transactions')
        .select('type, quantity')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo + 'T23:59:59');

      const typeMap: Record<string, { count: number; total_qty: number }> = {};
      (txns || []).forEach((t: { type: string; quantity: number }) => {
        if (!typeMap[t.type]) typeMap[t.type] = { count: 0, total_qty: 0 };
        typeMap[t.type].count++;
        typeMap[t.type].total_qty += t.quantity;
      });
      setTxnStats(Object.entries(typeMap).map(([type, v]) => ({ type, ...v })));

      setLoading(false);
    }
    load();
  }, [dateFrom, dateTo]);

  const byBranch: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  data.forEach(d => {
    byBranch[d.branch] = (byBranch[d.branch] || 0) + d.total_value;
    byCategory[d.category] = (byCategory[d.category] || 0) + d.total_value;
  });

  const branchData = Object.entries(byBranch).map(([name, value]) => ({ name, value }));
  const categoryData = Object.entries(byCategory).map(([name, value]) => ({ name, value }));
  const totalValue = Object.values(byBranch).reduce((s, v) => s + v, 0);
  const totalProducts = data.reduce((s, d) => Math.max(s, d.product_count), 0);
  const totalZero = data.reduce((s, d) => s + d.zero_stock_count, 0);
  const totalLow = data.reduce((s, d) => s + d.low_stock_count, 0);

  const handleExport = () => {
    const buf = exportInventoryValuationToExcel(data);
    downloadBlob(buf, `inventory-valuation_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">Reports & Valuation</h2>
        <button onClick={handleExport} className="btn-secondary"><Download className="w-4 h-4" />Export Valuation</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Inventory Value', value: `EGP ${totalValue.toLocaleString('en', { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: 'text-green-600 bg-green-50' },
          { label: 'Products Tracked', value: totalProducts.toLocaleString(), icon: Package, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Zero Stock Items', value: totalZero.toLocaleString(), icon: Package, color: 'text-red-600 bg-red-50' },
          { label: 'Low Stock Items', value: totalLow.toLocaleString(), icon: Package, color: 'text-amber-600 bg-amber-50' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className={`w-9 h-9 ${k.color} rounded-lg flex items-center justify-center mb-2`}>
              <k.icon className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold text-slate-900">{k.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Inventory Value by Branch</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={branchData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v) => [`EGP ${Number(v).toLocaleString()}`, 'Value']} />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Value by Category</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => `EGP ${Number(v).toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {categoryData.map((c, i) => (
              <span key={c.name} className="flex items-center gap-1 text-xs text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {c.name?.split('/')[0]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction Activity */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-slate-900">Transaction Activity</h3>
          <div className="flex gap-2 items-center text-sm">
            <input type="date" className="input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <span className="text-slate-400">to</span>
            <input type="date" className="input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {txnStats.length === 0 ? (
            <p className="col-span-6 text-center text-slate-400 py-4">No transactions in this period.</p>
          ) : txnStats.map(t => (
            <div key={t.type} className="bg-slate-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-slate-900">{t.count}</div>
              <div className="text-xs text-slate-500 capitalize mb-1">{t.type.replace('_', ' ')}</div>
              <div className="text-xs text-indigo-600">Qty: {t.total_qty.toFixed(1)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Valuation Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Valuation by Branch & Category</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="th">Branch</th>
                <th className="th">Category</th>
                <th className="th text-right">Total Value</th>
                <th className="th text-right">Products</th>
                <th className="th text-right">Zero Stock</th>
                <th className="th text-right">Low Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((d, i) => (
                <tr key={i} className="hover:bg-slate-50 transition">
                  <td className="td font-medium text-slate-900">{d.branch}</td>
                  <td className="td">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">{d.category}</span>
                  </td>
                  <td className="td text-right font-semibold text-green-700">EGP {d.total_value.toLocaleString('en', { maximumFractionDigits: 0 })}</td>
                  <td className="td text-right text-slate-600">{d.product_count}</td>
                  <td className="td text-right text-red-600">{d.zero_stock_count}</td>
                  <td className="td text-right text-amber-600">{d.low_stock_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
