import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeftRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  History,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import type {
  ActivityLogEntry,
  ActivityLogPage,
  ActivityLogQuery,
} from "../../types";
import { fetchActivityLogs } from "../../services/api";

type DatePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "previousMonth"
  | "custom";

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "thisMonth", label: "This month" },
  { value: "previousMonth", label: "Previous month" },
  { value: "custom", label: "Custom range" },
];

const MODULE_LABELS: Record<string, string> = {
  products: "Products",
  product: "Products",
  orders: "Orders",
  order: "Orders",
  customers: "Customers",
  customer: "Customers",
  categories: "Categories",
  category: "Categories",
  reviews: "Reviews",
  review: "Reviews",
  staff: "Staff & roles",
  suppliers: "Suppliers",
  supplier: "Suppliers",
  purchases: "Purchases",
  purchase: "Purchases",
  expenses: "Expenses",
  expense: "Expenses",
  account: "Account",
};

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  products: Package,
  product: Package,
  orders: ShoppingBag,
  order: ShoppingBag,
  customers: Users,
  customer: Users,
  categories: Tag,
  category: Tag,
  reviews: Activity,
  review: Activity,
  staff: Users,
  suppliers: Truck,
  supplier: Truck,
  purchases: Truck,
  purchase: Truck,
  expenses: Wallet,
  expense: Wallet,
  account: Wallet,
};

const ACTION_STYLES: Record<
  string,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  create: { label: "Created", className: "bg-emerald-50 text-emerald-700 ring-emerald-100", icon: Plus },
  update: { label: "Updated", className: "bg-blue-50 text-blue-700 ring-blue-100", icon: Pencil },
  delete: { label: "Deleted", className: "bg-red-50 text-red-700 ring-red-100", icon: Trash2 },
  status_change: { label: "Status changed", className: "bg-amber-50 text-amber-700 ring-amber-100", icon: ArrowLeftRight },
  payment: { label: "Payment", className: "bg-violet-50 text-violet-700 ring-violet-100", icon: CreditCard },
};

const localDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dateOffset = (days: number, from = new Date()) => {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return localDateString(date);
};

const getDateRange = (
  preset: DatePreset,
  customStart: string,
  customEnd: string,
) => {
  const today = new Date();
  const todayString = localDateString(today);
  if (preset === "today") return { startDate: todayString, endDate: todayString };
  if (preset === "yesterday") {
    const yesterday = dateOffset(-1, today);
    return { startDate: yesterday, endDate: yesterday };
  }
  if (preset === "last7") return { startDate: dateOffset(-6, today), endDate: todayString };
  if (preset === "last30") return { startDate: dateOffset(-29, today), endDate: todayString };
  if (preset === "thisMonth") {
    return {
      startDate: localDateString(new Date(today.getFullYear(), today.getMonth(), 1)),
      endDate: todayString,
    };
  }
  if (preset === "previousMonth") {
    return {
      startDate: localDateString(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      endDate: localDateString(new Date(today.getFullYear(), today.getMonth(), 0)),
    };
  }
  return {
    startDate: customStart || undefined,
    endDate: customEnd || undefined,
  };
};

const formatTimestamp = (log: ActivityLogEntry) => {
  const value = log.createdAt || log.date;
  if (!value) return "Time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatValue = (value: unknown) =>
  typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);

const describeChanges = (log: ActivityLogEntry) => {
  const oldValues = log.previousValues || {};
  const newValues = log.newValues || {};
  const keys = [...new Set([...Object.keys(oldValues), ...Object.keys(newValues)])];
  return keys
    .filter((key) => oldValues[key] !== newValues[key])
    .slice(0, 3)
    .map((key) => ({
      key,
      before: oldValues[key],
      after: newValues[key],
    }));
};

const SelectFilter = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) => (
  <label className="block min-w-0">
    <span className="mb-1 block text-[11px] font-semibold text-gray-500">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-xs text-gray-700 outline-none focus:border-[#00503a] focus:ring-2 focus:ring-[#00503a]/10"
    >
      <option value="">All</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

export const AdminActivityLogTab: React.FC = () => {
  const [preset, setPreset] = useState<DatePreset>("last7");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selected, setSelected] = useState<Omit<ActivityLogQuery, "page" | "limit" | "startDate" | "endDate">>({});
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<ActivityLogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const dateRange = useMemo(
    () => getDateRange(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );
  const query = useMemo<ActivityLogQuery>(
    () => ({
      ...selected,
      ...dateRange,
      page,
      limit: 20,
      search: search || undefined,
    }),
    [selected, dateRange, page, search],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetchActivityLogs(query)
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((fetchError: unknown) => {
        if (active) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Could not load staff activity.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query, reloadKey]);

  const updateFilter = (key: "staff" | "role" | "module" | "actionType", value: string) => {
    setPage(1);
    setSelected((current) => ({ ...current, [key]: value || undefined }));
  };

  const clearFilters = () => {
    setPreset("last7");
    setCustomStart("");
    setCustomEnd("");
    setSelected({});
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const totalPages = Math.max(result?.totalPages || 0, 1);
  const staffOptions = result?.filters.staff.map((staff) => ({
    value: staff.staffId || staff.name,
    label: staff.role ? `${staff.name} · ${staff.role}` : staff.name,
  })) || [];

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-montserrat text-lg font-bold text-gray-900 sm:text-xl">
            <History className="h-5 w-5 text-[#00503a]" /> Staff Activity Log
          </h2>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Review staff actions across your store, newest first.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          disabled={loading}
          className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="block sm:col-span-2 xl:col-span-1">
            <span className="mb-1 block text-[11px] font-semibold text-gray-500">Search activity</span>
            <span className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Staff or activity description"
                className="h-10 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-xs outline-none focus:border-[#00503a] focus:ring-2 focus:ring-[#00503a]/10"
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-gray-500">Date range</span>
            <span className="relative block">
              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={preset}
                onChange={(event) => {
                  setPage(1);
                  setPreset(event.target.value as DatePreset);
                }}
                className="h-10 w-full appearance-none rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-xs text-gray-700 outline-none focus:border-[#00503a] focus:ring-2 focus:ring-[#00503a]/10"
              >
                {DATE_PRESETS.map((item) => (
                  <option value={item.value} key={item.value}>{item.label}</option>
                ))}
              </select>
            </span>
          </label>
          <SelectFilter
            label="Staff member"
            value={selected.staff || ""}
            onChange={(value) => updateFilter("staff", value)}
            options={staffOptions}
          />
          <SelectFilter
            label="Role"
            value={selected.role || ""}
            onChange={(value) => updateFilter("role", value)}
            options={(result?.filters.roles || []).map((role) => ({ value: role, label: role }))}
          />
          <SelectFilter
            label="Module"
            value={selected.module || ""}
            onChange={(value) => updateFilter("module", value)}
            options={(result?.filters.modules || []).map((module) => ({
              value: module,
              label: MODULE_LABELS[module] || module,
            }))}
          />
          <SelectFilter
            label="Action type"
            value={selected.actionType || ""}
            onChange={(value) => updateFilter("actionType", value)}
            options={(result?.filters.actionTypes || []).map((action) => ({
              value: action,
              label: ACTION_STYLES[action]?.label || action,
            }))}
          />
          {preset === "custom" && (
            <div className="grid grid-cols-2 gap-2 sm:col-span-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-gray-500">From</span>
                <input
                  type="date"
                  value={customStart}
                  max={customEnd || undefined}
                  onChange={(event) => {
                    setPage(1);
                    setCustomStart(event.target.value);
                  }}
                  className="h-10 w-full rounded-lg border border-gray-200 px-2.5 text-xs outline-none focus:border-[#00503a]"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-gray-500">To</span>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart || undefined}
                  onChange={(event) => {
                    setPage(1);
                    setCustomEnd(event.target.value);
                  }}
                  className="h-10 w-full rounded-lg border border-gray-200 px-2.5 text-xs outline-none focus:border-[#00503a]"
                />
              </label>
            </div>
          )}
          <div className="flex items-end">
            <button
              type="button"
              onClick={clearFilters}
              className="h-10 rounded-lg px-3 text-xs font-semibold text-[#00503a] hover:bg-emerald-50"
            >
              Clear filters
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {loading && !result ? "Loading activities…" : (
            <><span className="font-bold text-gray-800">{result?.total || 0}</span> activities found</>
          )}
        </p>
        {loading && result && <Loader2 className="h-4 w-4 animate-spin text-[#00503a]" />}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
          <Activity className="mx-auto mb-3 h-9 w-9 text-red-400" />
          <p className="text-sm font-bold text-gray-800">Activity log could not be loaded</p>
          <p className="mt-1 text-xs text-gray-600">{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="mt-4 rounded-lg bg-[#00503a] px-4 py-2 text-xs font-bold text-white"
          >
            Try again
          </button>
        </div>
      ) : loading && !result ? (
        <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white p-12 text-sm text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#00503a]" /> Loading activity…
        </div>
      ) : result?.logs.length ? (
        <div className="relative space-y-3 before:absolute before:bottom-5 before:left-[19px] before:top-5 before:w-px before:bg-gray-200 sm:before:left-[23px]">
          {result.logs.map((log) => {
            const module = log.module || log.targetType;
            const ModuleIcon = MODULE_ICONS[module] || Package;
            const action = log.actionType
              ? ACTION_STYLES[log.actionType]
              : ACTION_STYLES.update;
            const ActionIcon = action.icon;
            const changes = describeChanges(log);
            return (
              <article
                key={log.id}
                className="relative flex gap-3 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm sm:gap-4 sm:p-4"
              >
                <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#00503a] ring-4 ring-[#f8f9fa] sm:h-12 sm:w-12">
                  <ModuleIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{log.staffName}</span>
                    {log.staffRole && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                        {log.staffRole}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${action.className}`}>
                      <ActionIcon className="h-3 w-3" />
                      {action.label}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-sm text-gray-700">
                    {log.description || log.details || log.action}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                    <span className="font-semibold text-gray-600">
                      {MODULE_LABELS[module] || module}
                    </span>
                    {log.targetName && <span className="truncate">· {log.targetName}</span>}
                    <time className="ml-auto whitespace-nowrap">{formatTimestamp(log)}</time>
                  </div>
                  {changes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {changes.map(({ key, before, after }) => (
                        <span
                          key={key}
                          className="rounded-md bg-gray-50 px-2 py-1 text-[10px] text-gray-600"
                        >
                          <span className="font-semibold">{key}</span>
                          {before !== undefined && <> {formatValue(before)} <span className="text-gray-400">→</span></>}
                          {after !== undefined && <> {formatValue(after)}</>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center">
          <History className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-semibold text-gray-700">No activity matches these filters</p>
          <p className="mt-1 text-xs text-gray-500">Try another date range or clear your filters.</p>
        </div>
      )}

      {!error && result && result.total > 0 && (
        <footer className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2.5">
          <span className="text-xs text-gray-500">
            Page <strong className="text-gray-800">{page}</strong> of{" "}
            <strong className="text-gray-800">{totalPages}</strong>
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-2.5 text-xs font-semibold text-gray-600 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-2.5 text-xs font-semibold text-gray-600 disabled:opacity-40"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </footer>
      )}
    </section>
  );
};
