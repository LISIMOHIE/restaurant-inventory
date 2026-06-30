'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Package, Users, ShoppingCart, AlertTriangle, TrendingUp, Warehouse, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface Stats {
  total_products: number;
  total_suppliers: number;
  active_po: number;
  low_stock: number;
  total_value: number;
  branches: { name: string; value: number; items: number }[];
  categories: { name: string; value: number }[];
  recent_transactions: {
    id: string; type: string; quantity: number; created_at: string;
    product: { name: string }; branch: { name: string };
  }[];
  low_stock_alerts: { name: string; branch: string; current_quantity: number; reorder_level: number; unit: string }[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

const TXN_TYPE_LABELS: Record<string, string> = {
  purchase: 'Purchase', adjustment: 'Adjustment', transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out', consumption: 'Consumption', waste: 'Waste', return: 'Return',
};

const TXN_COLORS: Record<string, string> = {
  purchase: 'bg-green-100 text-green-700', adjustment: 'bg-blue-100 text-blue-700',
  transfer_in: 'bg-cyan-100 text-cyan-700', transfer_out: 'bg-orange-100 text-orange-700',
  consumption: 'bg-purple-100 text-purple-700', waste: 'bg-red-100 text-red-700', return: 'bg-gray-100 text-gray-700',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const [products, suppliers, po, lowStock, valuation, transactions] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('suppliers').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).in('status', ['draft', 'ordered', 'partial']),
        supabase.from('low_stock_alerts').select('name, branch, current_quantity, reorder_level, unit').limit(10),
        supabase.from('inventory_valuation').select('*'),
        supabase.from('inventory_transactions')
          .select('id, type, quantity, created_at, product:products(name), branch:branches(name)')
          .order('created_at', { ascending: false }).limit(8),
      ]);

      // Aggregate by branch
      const branchMap: Record<string, { value: number; items: number }> = {};
      (valuation.data || []).forEach((v: { branch: string; total_value: number; product_count: number }) => {
        if (!branchMap[v.branch]) branchMap[v.branch] = { value: 0, items: 0 };
        branchMap[v.branch].value += v.total_value || 0;
        branchMap[v.branch].items += v.product_count || 0;
      });
      const branches = Object.entries(branchMap).map(([name, d]) => ({ name, ...d }));

      // Aggregate by category
      const catMap: Record<string, number> = {};
      (valuation.data || []).forEach((v: { category: string; total_value: number }) => {
        if (!catMap[v.category]) catMap[v.category] = 0;
        catMap[v.category] += v.total_value || 0;
      });
      const categories = Object.entries(catMap).map(([name, value]) => ({ name, value }));

      const totalValue = branches.reduce((s, b) => s + b.value, 0);

      setStats({
        total_products: products.count || 0,
        total_suppliers: suppliers.count || 0,
        active_po: po.count || 0,
        low_stock: lowStock.data?.length || 0,
        total_value: totalValue,
        branches,
        categories,
        recent_transactions: (transactions.data || []) as unknown as Stats['recent_transactions'],
        low_stock_alerts: (lowStock.data || []) as unknown as Stats['low_stock_alerts'],
      });
      setLoading(false);
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const kpis = [
    { label: 'Total Products', value: stats?.total_products.toLocaleString(), icon: Package, color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-200' },
    { label: 'Suppliers', value: stats?.total_suppliers.toLocaleString(), icon: Users, color: 'bg-purple-50 text-purple-600', border: 'border-purple-200' },
    { label: 'Active Orders', value: stats?.active_po.toLocaleString(), icon: ShoppingCart, color: 'bg-amber-50 text-amber-600', border: 'border-amber-200' },
    { label: 'Low Stock Alerts', value: stats?.low_stock.toLocaleString(), icon: AlertTriangle, color: 'bg-red-50 text-red-600', border: 'border-red-200' },
    { label: 'Inventory Value', value: `EGP ${(stats?.total_value || 0).toLocaleString('en', { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: 'bg-green-50 text-green-600', border: 'border-green-200' },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map(k => (
          <div key={k.label} className={`bg-white rounded-xl border ${k.border} p-4 shadow-sm`}>
            <div className={`w-10 h-10 ${k.color} rounded-lg flex items-center justify-center mb-3`}>
              <k.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{k.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory by Branch */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Inventory Value by Branch</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats?.branches} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v) => [`EGP ${Number(v).toLocaleString()}`, 'Value']} />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By Category Pie */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Value by Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats?.categories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name?.split('/')[0]} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                {stats?.categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => `EGP ${Number(v).toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl border border-red-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" /> Low Stock Alerts
            </h3>
            <Link href="/inventory" className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {stats?.low_stock_alerts.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">All stocked! No alerts.</p>
            ) : stats?.low_stock_alerts.map((a, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition">
                <div>
                  <div className="text-sm font-medium text-slate-900">{a.name}</div>
                  <div className="text-xs text-slate-500">{a.branch}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-red-600">{a.current_quantity} {a.unit}</div>
                  <div className="text-xs text-slate-400">Min: {a.reorder_level}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Recent Transactions</h3>
            <Link href="/inventory" className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {stats?.recent_transactions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No transactions yet.</p>
            ) : stats?.recent_transactions.map(t => (
              <div key={t.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TXN_COLORS[t.type] || 'bg-gray-100 text-gray-700'}`}>
                    {TXN_TYPE_LABELS[t.type] || t.type}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{(t.product as { name: string })?.name}</div>
                    <div className="text-xs text-slate-500">{(t.branch as { name: string })?.name}</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-slate-700">
                  {['transfer_out', 'consumption', 'waste'].includes(t.type) ? '-' : '+'}{t.quantity}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
