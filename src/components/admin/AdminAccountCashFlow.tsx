import React, { useState, useMemo } from 'react';
import { Product, OrderItem, PurchaseEntry, Expense } from '../../types';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Wallet, TrendingUp, TrendingDown, Landmark, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { generateSalesInsight } from '../../services/geminiService';

interface AdminAccountCashFlowProps {
  products: Product[];
  orders: OrderItem[];
  purchases: PurchaseEntry[];
  expenses: Expense[];
}

const formatTaka = (n: number) => `৳${(n || 0).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`;
const COLORS = ['#00503a', '#bb0027', '#B45309'];

export const AdminAccountCashFlow: React.FC<AdminAccountCashFlowProps> = ({ products, orders, purchases, expenses }) => {
  const [insight, setInsight] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  const now = new Date();
  const isThisMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const validOrders = useMemo(() => orders.filter((o) => o.status !== 'cancelled'), [orders]);

  const totalSales = useMemo(() => validOrders.reduce((s, o) => s + (o.total || 0), 0), [validOrders]);
  const totalPurchase = useMemo(() => purchases.reduce((s, p) => s + p.totalAmount, 0), [purchases]);
  const totalExpense = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  const salesThisMonth = useMemo(
    () => validOrders.filter((o) => isThisMonth(o.date)).reduce((s, o) => s + (o.total || 0), 0),
    [validOrders]
  );
  const cashReceived = useMemo(
    () => validOrders.reduce((s, o) => s + (o.paidAmount !== undefined ? o.paidAmount : o.total || 0), 0),
    [validOrders]
  );
  const cashPaidOut = useMemo(
    () => purchases.reduce((s, p) => s + p.paidAmount, 0) + totalExpense,
    [purchases, totalExpense]
  );
  const accountBalance = cashReceived - cashPaidOut;

  // Estimated profit: sales revenue minus (product cost of goods sold, when costPrice is set) minus expenses
  const estimatedProfit = useMemo(() => {
    const revenue = totalSales;
    const knownCost = purchases.reduce((s, p) => s + p.totalAmount, 0); // COGS proxy via purchases
    return revenue - knownCost - totalExpense;
  }, [totalSales, purchases, totalExpense]);

  const pieData = [
    { name: 'বিক্রি', value: totalSales },
    { name: 'ক্রয়', value: totalPurchase },
    { name: 'খরচ', value: totalExpense },
  ];

  const trendData = useMemo(() => {
    const days: { date: string; label: string; sales: number; purchase: number; expense: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days.push({ date: key, label: `${d.getDate()}/${d.getMonth() + 1}`, sales: 0, purchase: 0, expense: 0 });
    }
    const map = new Map(days.map((d) => [d.date, d]));
    validOrders.forEach((o) => {
      const row = map.get((o.date || '').split('T')[0]);
      if (row) row.sales += o.total || 0;
    });
    purchases.forEach((p) => {
      const row = map.get(p.date);
      if (row) row.purchase += p.totalAmount;
    });
    expenses.forEach((e) => {
      const row = map.get(e.date);
      if (row) row.expense += e.amount;
    });
    return days;
  }, [validOrders, purchases, expenses]);

  const lowStockProducts = useMemo(
    () => products.filter((p) => (p.stockQty ?? 0) <= (p.lowStockThreshold || 10)).slice(0, 5),
    [products]
  );

  const topProducts = useMemo(() => {
    const qtyMap = new Map<string, number>();
    validOrders.forEach((o) => {
      (o.orderedProducts || []).forEach((op: any) => {
        qtyMap.set(op.name || op.productName, (qtyMap.get(op.name || op.productName) || 0) + (op.quantity || 1));
      });
    });
    return Array.from(qtyMap.entries())
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [validOrders]);

  const handleGenerateInsight = async () => {
    setLoadingInsight(true);
    const result = await generateSalesInsight({
      totalSalesThisMonth: salesThisMonth,
      totalOrdersThisMonth: validOrders.filter((o) => isThisMonth(o.date)).length,
      topProducts,
      lowStockProducts: lowStockProducts.map((p) => ({ name: p.name, stockQty: p.stockQty || 0 })),
    });
    setInsight(result);
    setLoadingInsight(false);
  };

  const StatCard = ({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone: 'green' | 'red' | 'neutral' }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`w-4 h-4 ${tone === 'green' ? 'text-[#00503a]' : tone === 'red' ? 'text-[#bb0027]' : 'text-gray-500'}`} />
        <p className="text-[11px] text-gray-400 font-semibold uppercase">{label}</p>
      </div>
      <p className={`text-lg font-bold ${tone === 'green' ? 'text-[#00503a]' : tone === 'red' ? 'text-[#bb0027]' : 'text-gray-900'}`}>{value}</p>
    </div>
  );

  return (
    <div className="space-y-5 font-bengali">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 font-montserrat flex items-center gap-2">
          <Landmark className="w-5 h-5 text-[#00503a]" /> Account & Cash Flow
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">সব বিক্রি, ক্রয় ও খরচ একসাথে মিলিয়ে দেখুন।</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard icon={TrendingUp} label="মোট বিক্রি" value={formatTaka(totalSales)} tone="green" />
        <StatCard icon={TrendingDown} label="মোট ক্রয় + খরচ" value={formatTaka(totalPurchase + totalExpense)} tone="red" />
        <StatCard icon={Wallet} label="অ্যাকাউন্ট ব্যালান্স" value={formatTaka(accountBalance)} tone={accountBalance >= 0 ? 'green' : 'red'} />
        <StatCard icon={Landmark} label="আনুমানিক লাভ" value={formatTaka(estimatedProfit)} tone={estimatedProfit >= 0 ? 'green' : 'red'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-bold text-gray-800 mb-3">Financial Distribution</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatTaka(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-1 text-xs">
            {pieData.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1.5 text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} /> {d.name}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-bold text-gray-800 mb-3">Last 30 Days Trend</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" fontSize={10} interval={4} />
              <YAxis fontSize={10} />
              <Tooltip formatter={(v: number) => formatTaka(v)} />
              <Line type="monotone" dataKey="sales" stroke="#00503a" strokeWidth={2} dot={false} name="বিক্রি" />
              <Line type="monotone" dataKey="purchase" stroke="#bb0027" strokeWidth={2} dot={false} name="ক্রয়" />
              <Line type="monotone" dataKey="expense" stroke="#B45309" strokeWidth={2} dot={false} name="খরচ" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Sales Insight */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#00503a]" /> AI Sales Insight
          </p>
          <button
            onClick={handleGenerateInsight}
            disabled={loadingInsight}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00503a] text-white text-xs font-bold hover:bg-[#006a4e] transition-colors cursor-pointer disabled:opacity-60"
          >
            {loadingInsight ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {insight ? 'রিফ্রেশ করুন' : 'ইনসাইট জেনারেট করুন'}
          </button>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
          {insight || 'বাটনে ক্লিক করে এই মাসের বিক্রি ও স্টক নিয়ে AI-জেনারেটেড সংক্ষিপ্ত ইনসাইট দেখুন।'}
        </p>
      </div>
    </div>
  );
};
