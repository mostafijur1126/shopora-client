import React, { useState, useMemo } from "react";
import { OrderItem, PurchaseEntry, ReportExpense } from "../../types";
import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";

interface AdminReportsTabProps {
  orders: OrderItem[];
  purchases: PurchaseEntry[];
  expenses: ReportExpense[];
}

type ReportType = "sales" | "purchase" | "expense";

const PREVIEW_ROW_LIMIT = 100;

const formatTaka = (n: number) =>
  `৳${(n || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

// Escapes a field for safe CSV output (prevents formula injection and quote-breaking).
const csvSafe = (val: string | number) => {
  const str = String(val ?? "");
  const cleaned = /^[=+\-@]/.test(str) ? `'${str}` : str;
  return `"${cleaned.replace(/"/g, '""')}"`;
};

// Local calendar day (YYYY-MM-DD). toISOString() would use UTC and shift
// orders placed between 00:00 and 06:00 in Dhaka to the previous day.
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Day of a record, from its real timestamp when available.
const itemDay = (item: {
  timestamp?: number;
  createdAt?: any;
  date?: string;
}): string => {
  const ts =
    item.timestamp || (item.createdAt ? new Date(item.createdAt).getTime() : 0);
  if (ts && !Number.isNaN(ts)) return dayKey(new Date(ts));
  const parsed = item.date ? new Date(item.date) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? dayKey(parsed) : "";
};

export const AdminReportsTab: React.FC<AdminReportsTabProps> = ({
  orders,
  purchases,
  expenses,
}) => {
  const [reportType, setReportType] = useState<ReportType>("sales");
  const todayStr = dayKey(new Date());
  const [fromDate, setFromDate] = useState(() =>
    dayKey(new Date(Date.now() - 30 * 86400000)),
  );
  const [toDate, setToDate] = useState(todayStr);

  const inRange = (item: {
    timestamp?: number;
    createdAt?: any;
    date?: string;
  }) => {
    const d = itemDay(item);
    return d !== "" && d >= fromDate && d <= toDate;
  };

  const filteredSales = useMemo(
    () => orders.filter((o) => o.status !== "cancelled" && inRange(o)),
    [orders, fromDate, toDate],
  );
  const filteredPurchases = useMemo(
    () => purchases.filter(inRange),
    [purchases, fromDate, toDate],
  );
  const filteredExpenses = useMemo(
    () => expenses.filter(inRange),
    [expenses, fromDate, toDate],
  );

  const totals = {
    sales: filteredSales.reduce((s, o) => s + (o.total || 0), 0),
    purchase: filteredPurchases.reduce((s, p) => s + (p.totalAmount || 0), 0),
    expense: filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0),
  };

  const handleExportCsv = () => {
    let header: string[] = [];
    let rows: string[][] = [];

    if (reportType === "sales") {
      header = ["তারিখ", "ইনভয়েস", "কাস্টমার", "মোট", "স্ট্যাটাস"];
      rows = filteredSales.map((o) => [
        itemDay(o),
        o.invoiceId || o.id,
        o.customerName,
        String(o.total || 0),
        o.status,
      ]);
    } else if (reportType === "purchase") {
      header = ["তারিখ", "ইনভয়েস", "সাপ্লায়ার", "মোট", "বকেয়া", "স্ট্যাটাস"];
      rows = filteredPurchases.map((p) => [
        itemDay(p),
        p.invoiceId || p.id,
        p.supplierName,
        String(p.totalAmount),
        String(p.dueAmount),
        p.paymentStatus,
      ]);
    } else {
      header = ["তারিখ", "শিরোনাম", "ক্যাটাগরি", "পরিমাণ"];
      rows = filteredExpenses.map((e) => [
        itemDay(e),
        e.title,
        String(e.category),
        String(e.amount),
      ]);
    }

    const csvContent = [header, ...rows]
      .map((row) => row.map(csvSafe).join(","))
      .join("\r\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportType}-report-${fromDate}-to-${toDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const rowsForType: any[] =
    reportType === "sales"
      ? filteredSales
      : reportType === "purchase"
        ? filteredPurchases
        : filteredExpenses;

  return (
    <div className="space-y-5 font-bengali">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 font-montserrat flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#00503a]" /> Reports
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
          তারিখ অনুযায়ী রিপোর্ট দেখুন ও CSV এক্সপোর্ট করুন।
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex gap-2 bg-[#f8f9fa] p-1 rounded-xl">
          {(
            [
              ["sales", "বিক্রি", TrendingUp],
              ["purchase", "ক্রয়", TrendingDown],
              ["expense", "খরচ", Wallet],
            ] as [
              ReportType,
              string,
              React.ComponentType<{ className?: string }>,
            ][]
          ).map(([type, label, Icon]) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                reportType === type
                  ? "bg-[#00503a] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            max={toDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs"
          />
          <span className="text-xs text-gray-400">থেকে</span>
          <input
            type="date"
            value={toDate}
            min={fromDate}
            max={todayStr}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs"
          />
        </div>
        <button
          onClick={handleExportCsv}
          disabled={rowsForType.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#bb0027] text-white text-xs font-bold hover:bg-[#9c0021] transition-colors cursor-pointer ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5" /> CSV এক্সপোর্ট
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-3.5 text-center">
          <p className="text-[10px] text-gray-400 uppercase font-semibold">
            মোট বিক্রি
          </p>
          <p className="text-sm font-bold text-[#00503a]">
            {formatTaka(totals.sales)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-3.5 text-center">
          <p className="text-[10px] text-gray-400 uppercase font-semibold">
            মোট ক্রয়
          </p>
          <p className="text-sm font-bold text-[#bb0027]">
            {formatTaka(totals.purchase)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-3.5 text-center">
          <p className="text-[10px] text-gray-400 uppercase font-semibold">
            মোট খরচ
          </p>
          <p className="text-sm font-bold text-[#B45309]">
            {formatTaka(totals.expense)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {rowsForType.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            এই সময়সীমায় কোনো ডেটা পাওয়া যায়নি।
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">তারিখ</th>
                    <th className="text-left px-3 py-2 font-semibold">
                      {reportType === "expense" ? "শিরোনাম" : "নাম"}
                    </th>
                    <th className="text-right px-3 py-2 font-semibold">
                      পরিমাণ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rowsForType.slice(0, PREVIEW_ROW_LIMIT).map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 text-gray-600">
                        {itemDay(row)}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-800">
                        {reportType === "sales"
                          ? row.customerName
                          : reportType === "purchase"
                            ? row.supplierName
                            : row.title}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-gray-900">
                        {formatTaka(
                          reportType === "sales"
                            ? row.total
                            : reportType === "purchase"
                              ? row.totalAmount
                              : row.amount,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rowsForType.length > PREVIEW_ROW_LIMIT && (
              <p className="px-3 py-2 text-[11px] text-gray-500 border-t border-gray-100">
                প্রথম {PREVIEW_ROW_LIMIT}টি দেখানো হচ্ছে (মোট{" "}
                {rowsForType.length}টি)। সবগুলো পেতে CSV এক্সপোর্ট করুন।
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
