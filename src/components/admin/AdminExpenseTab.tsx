import React, { useState, useMemo } from 'react';
import { Expense, ExpenseCategory, ExpensePaymentMethod, RecurrenceFrequency } from '../../types';
import {
  Plus,
  Trash2,
  Search,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Repeat,
  Wallet,
  Home,
  Zap,
  Users,
  Truck,
  Megaphone,
  Wrench,
  MoreHorizontal,
  Filter
} from 'lucide-react';

interface AdminExpenseTabProps {
  expenses?: Expense[];
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
}

const PRESET_CATEGORIES: { value: ExpenseCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'Rent', label: 'ভাড়া', icon: Home },
  { value: 'Utility Bill', label: 'বিল (বিদ্যুৎ/ইন্টারনেট)', icon: Zap },
  { value: 'Salary', label: 'বেতন', icon: Users },
  { value: 'Transport', label: 'পরিবহন', icon: Truck },
  { value: 'Marketing', label: 'মার্কেটিং', icon: Megaphone },
  { value: 'Maintenance', label: 'মেইনটেন্যান্স', icon: Wrench },
  { value: 'Other', label: 'অন্যান্য', icon: MoreHorizontal },
];

const PAYMENT_METHODS: { value: ExpensePaymentMethod; label: string }[] = [
  { value: 'cash', label: 'ক্যাশ' },
  { value: 'bkash', label: 'বিকাশ' },
  { value: 'nagad', label: 'নগদ' },
  { value: 'bank', label: 'ব্যাংক ট্রান্সফার' },
  { value: 'card', label: 'কার্ড' },
];

const RECURRENCE_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'weekly', label: 'সাপ্তাহিক' },
  { value: 'monthly', label: 'মাসিক' },
  { value: 'yearly', label: 'বাৎসরিক' },
];

const formatTaka = (n: number) => `৳${(n || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;

const computeNextDueDate = (dateStr: string, frequency: RecurrenceFrequency): string => {
  const d = new Date(dateStr);
  if (frequency === 'weekly') d.setDate(d.getDate() + 7);
  else if (frequency === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
};

export const AdminExpenseTab: React.FC<AdminExpenseTabProps> = ({
  expenses = [],
  onAddExpense,
  onDeleteExpense,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('Rent');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>('cash');
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('monthly');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const resetForm = () => {
    setTitle('');
    setCategory('Rent');
    setCustomCategory('');
    setIsCustomCategory(false);
    setAmount('');
    setPaymentMethod('cash');
    setNote('');
    setIsRecurring(false);
    setRecurrenceFrequency('monthly');
    setFormError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    const finalCategory = isCustomCategory ? customCategory.trim() : category;
    const amt = parseFloat(amount);

    if (!title.trim()) {
      setFormError('এক্সপেন্সের নাম/শিরোনাম দিন।');
      return;
    }
    if (isCustomCategory && !customCategory.trim()) {
      setFormError('কাস্টম ক্যাটাগরির নাম দিন।');
      return;
    }
    if (!amt || amt <= 0) {
      setFormError('সঠিক পরিমাণ (amount) দিন।');
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    const newExpense: Expense = {
      id: `EXP-${Date.now()}`,
      title: title.trim(),
      category: finalCategory,
      amount: amt,
      paymentMethod,
      note: note.trim(),
      date: today,
      isRecurring,
      recurrenceFrequency: isRecurring ? recurrenceFrequency : undefined,
      nextDueDate: isRecurring ? computeNextDueDate(today, recurrenceFrequency) : undefined,
      timestamp: Date.now(),
    };

    onAddExpense(newExpense);
    setSuccessMsg(`"${newExpense.title}" এক্সপেন্স যোগ হয়েছে — ${formatTaka(amt)}`);
    resetForm();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((e) => {
        const matchesSearch =
          e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(e.category).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterCategory === 'all' || e.category === filterCategory;
        return matchesSearch && matchesFilter;
      }),
    [expenses, searchTerm, filterCategory]
  );

  const totalThisMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const totalAllTime = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  const recurringUpcoming = useMemo(
    () => expenses.filter((e) => e.isRecurring && e.nextDueDate).sort((a, b) => (a.nextDueDate! > b.nextDueDate! ? 1 : -1)),
    [expenses]
  );

  const categoryIcon = (cat: string) => {
    const preset = PRESET_CATEGORIES.find((p) => p.value === cat);
    return preset ? preset.icon : MoreHorizontal;
  };

  const categoryLabel = (cat: string) => {
    const preset = PRESET_CATEGORIES.find((p) => p.value === cat);
    return preset ? preset.label : cat;
  };

  return (
    <div className="space-y-5 font-bengali">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 font-montserrat flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#00503a]" />
            Expense Tracking
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">দোকানের সব খরচ এক জায়গায় ট্র্যাক করুন।</p>
        </div>
        <div className="flex gap-2.5">
          <div className="flex items-center gap-2 bg-white rounded-2xl border border-gray-100 px-4 py-2.5 shadow-sm">
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase">এই মাসের খরচ</p>
              <p className="text-sm font-bold text-[#bb0027]">{formatTaka(totalThisMonth)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-2xl border border-gray-100 px-4 py-2.5 shadow-sm">
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase">সর্বমোট খরচ</p>
              <p className="text-sm font-bold text-gray-800">{formatTaka(totalAllTime)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recurring upcoming reminders */}
      {recurringUpcoming.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3.5 flex items-start gap-2.5">
          <Repeat className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-800">
            <span className="font-bold">আসন্ন Recurring খরচ: </span>
            {recurringUpcoming.slice(0, 3).map((e, i) => (
              <span key={e.id}>
                {i > 0 && ', '}
                {e.title} ({e.nextDueDate})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Add Expense Form */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 space-y-3.5">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-[#00503a]" /> নতুন এক্সপেন্স যোগ করুন
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">শিরোনাম *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="যেমন: দোকান ভাড়া - সেপ্টেম্বর"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a]/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">ক্যাটাগরি</label>
              {!isCustomCategory ? (
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomCategory(true);
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a]/30"
                >
                  {PRESET_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                  <option value="__custom__">+ কাস্টম ক্যাটাগরি লিখুন</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="কাস্টম ক্যাটাগরির নাম"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a]/30"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(false);
                      setCustomCategory('');
                    }}
                    className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-gray-50 cursor-pointer"
                  >
                    প্রিসেট
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">পরিমাণ (৳) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a]/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">পেমেন্ট মেথড</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as ExpensePaymentMethod)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a]/30"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Recurring toggle */}
            <div className="bg-[#f8f9fa] rounded-xl p-3 border border-gray-100">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-[#00503a]" /> Recurring খরচ?
                </span>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 accent-[#00503a] cursor-pointer"
                />
              </label>
              {isRecurring && (
                <select
                  value={recurrenceFrequency}
                  onChange={(e) => setRecurrenceFrequency(e.target.value as RecurrenceFrequency)}
                  className="w-full mt-2.5 px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#00503a]/30"
                >
                  {RECURRENCE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">নোট (ঐচ্ছিক)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a]/30"
              />
            </div>

            {formError && (
              <p className="text-xs font-semibold text-[#bb0027] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> {formError}
              </p>
            )}
            {successMsg && (
              <p className="text-xs font-semibold text-[#00503a] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> {successMsg}
              </p>
            )}

            <button
              type="submit"
              className="w-full px-4 py-3 rounded-xl bg-[#00503a] text-white font-bold text-sm hover:bg-[#006a4e] transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Receipt className="w-4 h-4" /> এক্সপেন্স সেভ করুন
            </button>
          </form>
        </div>

        {/* Expense List */}
        <div className="lg:col-span-2 space-y-3.5">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="খরচ খুঁজুন..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#00503a]/30"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#00503a]/30"
              >
                <option value="all">সব ক্যাটাগরি</option>
                {PRESET_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500">এখনো কোনো এক্সপেন্স এন্ট্রি নেই।</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredExpenses.map((exp) => {
                const Icon = categoryIcon(exp.category);
                return (
                  <div
                    key={exp.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                        <Icon className="w-4.5 h-4.5 text-[#00503a]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{exp.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>{categoryLabel(exp.category)}</span>
                          <span>·</span>
                          <span>{exp.date}</span>
                          {exp.isRecurring && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
                              <Repeat className="w-2.5 h-2.5" /> {exp.recurrenceFrequency}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="text-sm font-bold text-[#bb0027]">{formatTaka(exp.amount)}</p>
                      <button
                        onClick={() => onDeleteExpense(exp.id)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-[#bb0027] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
