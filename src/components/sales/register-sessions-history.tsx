"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Building2,
  Calendar,
  Clock,
  DollarSign,
  Eye,
  AlertTriangle,
  Search,
  User,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Columns,
  Check,
  Receipt,
  FileSpreadsheet,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { useMoney } from "@/hooks/useMoney";
import type { RegisterSession } from "@/lib/api/pos-session";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_OPTIONS = ["ALL", "OPEN", "CLOSED"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

const DATE_RANGES = ["Today", "7 days", "30 days", "All time"] as const;
type DateRange = (typeof DATE_RANGES)[number];

const SESSION_PAGE_SIZES = [10, 25, 50] as const;
const DEFAULT_SESSION_PAGE_SIZE: (typeof SESSION_PAGE_SIZES)[number] = 10;

export type SessionColumnKey =
  | "sessionId"
  | "registerAndCashier"
  | "orderCount"
  | "openedAt"
  | "closedAt"
  | "openingCash"
  | "cashSales"
  | "expectedTotal"
  | "actualCash"
  | "difference"
  | "status"
  | "action";

interface SessionColumnConfig {
  key: SessionColumnKey;
  label: string;
}

const ALL_SESSION_COLUMNS: SessionColumnConfig[] = [
  { key: "sessionId", label: "Session ID" },
  { key: "registerAndCashier", label: "Register & Cashier" },
  { key: "orderCount", label: "Orders" },
  { key: "openedAt", label: "Opened At" },
  { key: "closedAt", label: "Closed At" },
  { key: "openingCash", label: "Opening Cash" },
  { key: "cashSales", label: "Cash Sales" },
  { key: "expectedTotal", label: "Expected Total" },
  { key: "actualCash", label: "Counted Cash" },
  { key: "difference", label: "Difference" },
  { key: "status", label: "Status" },
  { key: "action", label: "Action" },
];

export function RegisterSessionsHistory() {
  const { format } = useMoney();

  // Dynamic state
  const [sessions, setSessions] = useState<RegisterSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Search
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [dateRange, setDateRange] = useState<DateRange>("All time");

  // Selected session for Summary Details modal
  const [selectedSession, setSelectedSession] = useState<RegisterSession | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Date range dropdown state
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);

  // Pagination state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<(typeof SESSION_PAGE_SIZES)[number]>(
    DEFAULT_SESSION_PAGE_SIZE
  );

  // Column visibility state
  const [columnsDropdownOpen, setColumnsDropdownOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<SessionColumnKey, boolean>>({
    sessionId: true,
    registerAndCashier: true,
    orderCount: true,
    openedAt: true,
    closedAt: true,
    openingCash: true,
    cashSales: true,
    expectedTotal: true,
    actualCash: false,
    difference: true,
    status: true,
    action: true,
  });

  const activeColumnCount = useMemo(
    () => Object.values(visibleColumns).filter(Boolean).length,
    [visibleColumns]
  );

  const toggleColumn = (key: SessionColumnKey) => {
    setVisibleColumns((prev) => {
      const count = Object.values(prev).filter(Boolean).length;
      if (prev[key] && count <= 1) return prev; // Keep at least 1 column visible
      return { ...prev, [key]: !prev[key] };
    });
  };

  const selectAllColumns = () => {
    setVisibleColumns({
      sessionId: true,
      registerAndCashier: true,
      orderCount: true,
      openedAt: true,
      closedAt: true,
      openingCash: true,
      cashSales: true,
      expectedTotal: true,
      actualCash: true,
      difference: true,
      status: true,
      action: true,
    });
  };

  // Open Details Modal with live fetch from /api/register/sessions/{sessionId}/summary
  const handleOpenDetails = useCallback(async (session: RegisterSession) => {
    setSelectedSession(session);
    setLoadingSummary(true);

    try {
      const res = await fetch(`/api/register/sessions/${session.id}/summary?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const summaryData: RegisterSession = await res.json();
        setSelectedSession(summaryData);
      }
    } catch (err) {
      console.warn("Failed to fetch fresh session summary, using table row data:", err);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  // Fetch dynamic session history data from backend API
  const fetchSessions = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const res = await fetch(`/api/register/sessions?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch register sessions");
      }
      const data: RegisterSession[] = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch register sessions from server:", err);
      setSessions([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Filter & Sort logic
  const filteredSessions = useMemo(() => {
    return sessions
      .filter((session) => {
        // Status filter
        if (statusFilter !== "ALL" && session.status !== statusFilter) {
          return false;
        }

        // Search query filter
        if (query.trim()) {
          const q = query.toLowerCase();
          const matchesCashier = session.cashierName?.toLowerCase().includes(q);
          const matchesRegister = session.registerName?.toLowerCase().includes(q);
          const matchesId = session.id.toString().includes(q);
          const matchesUser = session.userId?.toLowerCase().includes(q);
          const matchesRecon = session.reconciliationStatus?.toLowerCase().includes(q);
          const matchesNote = session.note?.toLowerCase().includes(q);

          if (!matchesCashier && !matchesRegister && !matchesId && !matchesUser && !matchesRecon && !matchesNote) {
            return false;
          }
        }

        // Date range filter
        if (dateRange !== "All time" && session.openedAt) {
          const openedDate = new Date(session.openedAt);
          const now = new Date();
          if (dateRange === "Today") {
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            if (openedDate < startOfDay) return false;
          } else if (dateRange === "7 days") {
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (openedDate < sevenDaysAgo) return false;
          } else if (dateRange === "30 days") {
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (openedDate < thirtyDaysAgo) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = a.openedAt ? new Date(a.openedAt).getTime() : a.id;
        const timeB = b.openedAt ? new Date(b.openedAt).getTime() : b.id;
        return timeB - timeA;
      });
  }, [sessions, query, statusFilter, dateRange]);

  // A filter change can leave the current page past the end of the new
  // result set, so it resets back to the first page rather than showing
  // an empty table the user has to notice and back out of themselves.
  useEffect(() => {
    setPage(0);
  }, [query, statusFilter, dateRange]);

  const pageCount = Math.max(Math.ceil(filteredSessions.length / pageSize), 1);
  const pagedSessions = useMemo(
    () => filteredSessions.slice(page * pageSize, page * pageSize + pageSize),
    [filteredSessions, page, pageSize]
  );
  const firstRow = filteredSessions.length === 0 ? 0 : page * pageSize + 1;
  const lastRow = Math.min(filteredSessions.length, page * pageSize + pageSize);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const activeCount = sessions.filter((s) => s.status === "OPEN").length;
    const totalOpening = filteredSessions.reduce((sum, s) => sum + s.openingBalance, 0);
    const totalSales = filteredSessions.reduce((sum, s) => sum + s.totalCashSales, 0);
    const totalDiscrepancies = filteredSessions.reduce(
      (sum, s) => sum + Math.abs(s.differenceAmount || 0),
      0
    );

    return {
      activeCount,
      totalOpening,
      totalSales,
      totalDiscrepancies,
    };
  }, [sessions, filteredSessions]);

  function formatDate(isoStr?: string | null) {
    if (!isoStr) return "—";
    try {
      const normalizedStr = isoStr.includes(" ") && !isoStr.includes("T") ? isoStr.replace(" ", "T") : isoStr;
      const d = new Date(normalizedStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 text-foreground ">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground dark:text-white tracking-tight">
            Register Sessions
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground dark:text-slate-400 mt-1">
            Track live and past till opens, closes, starting floats, cash sales, and shift discrepancies.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800/80 dark:bg-[#151c28]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground dark:text-slate-400 uppercase tracking-wider">
              Active Sessions
            </span>
            <div className="flex h-8 sm:h-9 w-8 sm:w-9 items-center justify-center rounded-xl bg-primary/10 text-primary dark:border dark:border-primary/25">
              <Clock className="h-4 sm:h-5 w-4 sm:w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-foreground dark:text-white">
              {metrics.activeCount}
            </span>
            <span className="text-xs font-semibold text-primary bg-primary/10 dark:border dark:border-primary/25 px-2 py-0.5 rounded-md">
              Live Tills
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800/80 dark:bg-[#151c28]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground dark:text-slate-400 uppercase tracking-wider">
              Opening Cash
            </span>
            <div className="flex h-8 sm:h-9 w-8 sm:w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400 dark:border dark:border-blue-800/50">
              <Building2 className="h-4 sm:h-5 w-4 sm:w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-bold text-foreground dark:text-white">
              {format(metrics.totalOpening)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800/80 dark:bg-[#151c28]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground dark:text-slate-400 uppercase tracking-wider">
              Total Cash Sales
            </span>
            <div className="flex h-8 sm:h-9 w-8 sm:w-9 items-center justify-center rounded-xl bg-primary/10 text-primary dark:border dark:border-primary/25">
              <DollarSign className="h-4 sm:h-5 w-4 sm:w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-bold text-foreground dark:text-white">
              {format(metrics.totalSales)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800/80 dark:bg-[#151c28]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground dark:text-slate-400 uppercase tracking-wider">
              Total Cash Discrepancy
            </span>
            <div className="flex h-8 sm:h-9 w-8 sm:w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400 dark:border dark:border-amber-800/50">
              <AlertTriangle className="h-4 sm:h-5 w-4 sm:w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-bold text-foreground dark:text-white">
              {format(metrics.totalDiscrepancies)}
            </span>
          </div>
        </div>
      </div>

      {/* Filters and Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-xs dark:border-slate-800/80 dark:bg-[#151c28]">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search "
            className="w-full rounded-xl border border-border bg-muted/40 dark:bg-[#0d121c] dark:border-slate-800 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-foreground dark:text-slate-100 placeholder:text-muted-foreground dark:placeholder:text-slate-500 outline-none transition-colors focus:border-primary"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-slate-400 hover:text-foreground dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Status Tabs */}
          <div className="inline-flex rounded-xl bg-muted dark:bg-[#0d121c] p-1 border border-border/60 dark:border-slate-800/60">
            {STATUS_OPTIONS.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-all focus:outline-none ${
                  statusFilter === st
                    ? "bg-white text-slate-900 shadow-sm font-semibold dark:bg-[#1d2739] dark:text-white dark:border dark:border-slate-700"
                    : "text-muted-foreground dark:text-slate-400 hover:text-foreground dark:hover:text-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Date Filter Dropdown */}
          <div className="relative inline-block text-left">
            <button
              type="button"
              onClick={() => setDateDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card dark:bg-[#0d121c] dark:border-slate-800 px-3 sm:px-3.5 py-2 text-xs font-medium text-foreground dark:text-slate-200 shadow-xs transition-all hover:bg-accent dark:hover:bg-[#182132] active:scale-95"
            >
              <Calendar className="h-4 w-4 text-muted-foreground dark:text-slate-400" />
              <span>{dateRange}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-muted-foreground dark:text-slate-400 transition-transform ${dateDropdownOpen ? "rotate-180" : ""
                  }`}
              />
            </button>

            {dateDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setDateDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-2 z-30 w-40 rounded-2xl border border-border bg-card dark:bg-[#151c28] dark:border-slate-800 p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 text-foreground dark:text-slate-100">
                  {DATE_RANGES.map((d) => {
                    const isActive = dateRange === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setDateRange(d);
                          setDateDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${isActive
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "text-foreground dark:text-slate-200 hover:bg-muted dark:hover:bg-[#1c2638]"
                          }`}
                      >
                        {d}
                        {isActive && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Column Picker Dropdown */}
          <div className="relative inline-block text-left">
            <button
              type="button"
              onClick={() => setColumnsDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card dark:bg-[#0d121c] dark:border-slate-800 px-3 sm:px-3.5 py-2 text-xs font-medium text-foreground dark:text-slate-200 shadow-xs transition-all hover:bg-accent dark:hover:bg-[#182132] active:scale-95"
            >
              <Columns className="h-4 w-4 text-muted-foreground dark:text-slate-400" />
              <span>Columns</span>
              <span className="ml-0.5 rounded-md bg-muted dark:bg-[#1d2739] px-1.5 py-0.5 text-[10px] font-bold text-foreground dark:text-slate-300">
                {activeColumnCount}/{ALL_SESSION_COLUMNS.length}
              </span>
            </button>

            {columnsDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setColumnsDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 z-30 w-56 rounded-2xl border border-border bg-card dark:bg-[#151c28] dark:border-slate-800 p-3 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 text-foreground dark:text-slate-100">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-border dark:border-slate-800 px-1">
                    <span className="text-xs font-bold text-foreground dark:text-white">
                      Toggle Columns
                    </span>
                    <button
                      type="button"
                      onClick={selectAllColumns}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Show All
                    </button>
                  </div>
                  <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                    {ALL_SESSION_COLUMNS.map((col) => {
                      const isChecked = visibleColumns[col.key];
                      return (
                        <label
                          key={col.key}
                          onClick={() => toggleColumn(col.key)}
                          className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-foreground dark:text-slate-200 hover:bg-muted dark:hover:bg-[#1c2638] cursor-pointer select-none"
                        >
                          <span className="font-medium">{col.label}</span>
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${isChecked
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-border dark:border-slate-700 bg-background dark:bg-[#0d121c]"
                              }`}
                          >
                            {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-2xl border border-border bg-card dark:border-slate-800/80 dark:bg-[#151c28] overflow-hidden">
        <div className="overflow-x-auto min-w-full">
          <Table className="w-full text-left text-sm">
            <TableHeader className="bg-muted/50 dark:bg-[#0f1520]">
              <TableRow className="border-b border-border dark:border-slate-800">
                {visibleColumns.sessionId && (
                  <TableHead className="font-semibold text-xs text-muted-foreground dark:text-slate-400 uppercase tracking-wider">
                    Session ID
                  </TableHead>
                )}
                {visibleColumns.registerAndCashier && (
                  <TableHead className="font-semibold text-xs text-muted-foreground dark:text-slate-400 uppercase tracking-wider">
                    Register & Cashier
                  </TableHead>
                )}
                {visibleColumns.orderCount && (
                  <TableHead className="font-semibold text-xs text-muted-foreground dark:text-slate-400 uppercase tracking-wider text-center">
                    Orders
                  </TableHead>
                )}
                {visibleColumns.openedAt && (
                  <TableHead className="font-semibold text-xs text-muted-foreground dark:text-slate-400 uppercase tracking-wider">
                    Opened At
                  </TableHead>
                )}
                {visibleColumns.closedAt && (
                  <TableHead className="font-semibold text-xs text-muted-foreground dark:text-slate-400 uppercase tracking-wider">
                    Closed At
                  </TableHead>
                )}
                {visibleColumns.openingCash && (
                  <TableHead className="font-semibold text-xs text-muted-foreground dark:text-slate-400 uppercase tracking-wider text-right">
                    Opening Cash
                  </TableHead>
                )}
                {visibleColumns.cashSales && (
                  <TableHead className="font-semibold text-xs text-muted-foreground dark:text-slate-400 uppercase tracking-wider text-right">
                    Cash Sales
                  </TableHead>
                )}
                {visibleColumns.expectedTotal && (
                  <TableHead className="font-semibold text-xs text-muted-foreground dark:text-slate-400 uppercase tracking-wider text-right">
                    Expected Total
                  </TableHead>
                )}
                {visibleColumns.actualCash && (
                  <TableHead className="font-semibold text-xs text-muted-foreground dark:text-slate-400 uppercase tracking-wider text-right">
                    Counted Cash
                  </TableHead>
                )}
                {visibleColumns.difference && (
                  <TableHead className="font-semibold text-xs text-muted-foreground dark:text-slate-400 uppercase tracking-wider text-right">
                    Difference
                  </TableHead>
                )}
                {visibleColumns.status && (
                  <TableHead className="font-semibold text-xs text-muted-foreground dark:text-slate-400 uppercase tracking-wider text-center">
                    Status
                  </TableHead>
                )}
                {visibleColumns.action && (
                  <TableHead className="font-semibold text-xs text-muted-foreground dark:text-slate-400 uppercase tracking-wider text-right">
                    Action
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, rowIdx) => (
                  <TableRow key={rowIdx} className="border-b border-border/60 dark:border-slate-800/60">
                    {ALL_SESSION_COLUMNS.filter((col) => visibleColumns[col.key]).map((col) => (
                      <TableCell key={col.key}>
                        <Skeleton className="h-4 w-full max-w-24" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredSessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={activeColumnCount || 1} className="h-40 text-center text-muted-foreground dark:text-slate-400">
                    No register sessions found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                pagedSessions.map((session) => {
                  const diff = session.differenceAmount;
                  const isShortage = diff !== null && diff < 0;
                  const isSurplus = diff !== null && diff > 0;

                  return (
                    <TableRow
                      key={session.id}
                      onClick={() => handleOpenDetails(session)}
                      className="cursor-pointer border-b border-border/60 dark:border-slate-800/60 hover:bg-muted/40 dark:hover:bg-[#1a2333] transition-colors"
                    >
                      {visibleColumns.sessionId && (
                        <TableCell className="font-mono text-xs font-semibold text-foreground dark:text-slate-300">
                          #{session.id}
                        </TableCell>
                      )}
                      {visibleColumns.registerAndCashier && (
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm text-foreground dark:text-slate-100">
                              {session.registerName || `Register #${session.registerId || 1}`}
                            </span>
                            <span className="text-xs text-muted-foreground dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <User className="h-3 w-3" />
                              {session.cashierName || "Cashier"}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.orderCount && (
                        <TableCell className="text-center font-medium text-xs text-foreground dark:text-slate-300">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted dark:bg-slate-800/60 font-semibold">
                            <Receipt className="h-3 w-3 text-muted-foreground dark:text-slate-400" />
                            {session.orderCount ?? 0}
                          </span>
                        </TableCell>
                      )}
                      {visibleColumns.openedAt && (
                        <TableCell className="text-xs text-muted-foreground dark:text-slate-300 whitespace-nowrap">
                          {formatDate(session.openedAt)}
                        </TableCell>
                      )}
                      {visibleColumns.closedAt && (
                        <TableCell className="text-xs text-muted-foreground dark:text-slate-300 whitespace-nowrap">
                          {session.status === "OPEN" ? (
                            <span className="italic text-primary font-medium">
                              In Progress
                            </span>
                          ) : (
                            formatDate(session.closedAt)
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.openingCash && (
                        <TableCell className="text-sm text-foreground dark:text-slate-200 text-right font-medium">
                          {format(session.openingBalance, session.currency ?? undefined)}
                        </TableCell>
                      )}
                      {visibleColumns.cashSales && (
                        <TableCell className="text-sm font-semibold text-foreground dark:text-slate-100 text-right">
                          {format(session.totalCashSales, session.currency ?? undefined)}
                        </TableCell>
                      )}
                      {visibleColumns.expectedTotal && (
                        <TableCell className="text-sm font-semibold text-primary text-right">
                          {format(session.expectedAmount, session.currency ?? undefined)}
                        </TableCell>
                      )}
                      {visibleColumns.actualCash && (
                        <TableCell className="text-sm font-medium text-foreground dark:text-slate-200 text-right">
                          {session.actualAmount !== null ? (
                            format(session.actualAmount, session.currency ?? undefined)
                          ) : (
                            <span className="text-xs text-muted-foreground dark:text-slate-500">—</span>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.difference && (
                        <TableCell className="text-right">
                          {session.status === "OPEN" ? (
                            <span className="text-xs text-muted-foreground dark:text-slate-500">—</span>
                          ) : isShortage ? (
                            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/80 dark:border dark:border-red-900/50 px-2 py-0.5 rounded-md">
                              <ArrowDownRight className="h-3.5 w-3.5" />
                              {format(diff, session.currency ?? undefined)}
                            </span>
                          ) : isSurplus ? (
                            <span className="inline-flex items-center gap-0.5 text-sm font-bold text-primary bg-primary/10 dark:border dark:border-primary/25 px-2 py-0.5 rounded-md">
                              <ArrowUpRight className="h-3.5 w-3.5" />
                              +{format(diff, session.currency ?? undefined)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground dark:text-slate-400 bg-muted dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              0.00
                            </span>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.status && (
                        <TableCell className="text-center">
                          {session.status === "OPEN" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 dark:border dark:border-emerald-800/50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                              OPEN
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-950/80 dark:border dark:border-red-900/50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:text-red-400">
                              CLOSED
                            </span>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.action && (
                        <TableCell className="text-right">
                          <button
                            type="button"
                            onClick={(event) => {
                              // The row underneath opens the same modal, so
                              // this only needs to stop it from also firing
                              // and doubling the fetch.
                              event.stopPropagation();
                              handleOpenDetails(session);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 hover:underline"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Details
                          </button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border dark:border-slate-800 px-4 py-3">
          <p className="text-[13px] text-muted-foreground dark:text-slate-400">
            {filteredSessions.length === 0
              ? "No sessions"
              : `Showing ${firstRow}–${lastRow} of ${filteredSessions.length}`}
          </p>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[13px] text-muted-foreground dark:text-slate-400">
              Rows
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value) as (typeof SESSION_PAGE_SIZES)[number]);
                  setPage(0);
                }}
                className="h-8 rounded-lg border border-border dark:border-slate-800 bg-card dark:bg-[#0d121c] px-2 text-[13px] text-foreground dark:text-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {SESSION_PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                disabled={page === 0}
                aria-label="Previous page"
                className="grid size-8 place-items-center rounded-lg border border-border dark:border-slate-800 text-foreground dark:text-slate-200 outline-none transition-colors hover:bg-muted dark:hover:bg-[#1c2638] focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <span
                className="min-w-24 text-center text-[13px] tabular-nums text-muted-foreground dark:text-slate-400"
                aria-live="polite"
              >
                Page {page + 1} of {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(pageCount - 1, prev + 1))}
                disabled={page + 1 >= pageCount}
                aria-label="Next page"
                className="grid size-8 place-items-center rounded-lg border border-border dark:border-slate-800 text-foreground dark:text-slate-200 outline-none transition-colors hover:bg-muted dark:hover:bg-[#1c2638] focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Session Details / Summary Modal */}
      {selectedSession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setSelectedSession(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg rounded-3xl border border-border bg-card dark:bg-[#151c28] dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-foreground dark:text-slate-100"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border dark:border-slate-800 px-6 py-4 bg-muted/30 dark:bg-[#0f1520]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground dark:text-white">
                      Session Summary #{selectedSession.id}
                    </h3>
                    {loadingSummary && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="text-muted-foreground dark:text-slate-400 transition-colors hover:text-foreground dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex flex-col gap-5 p-6 text-sm max-h-[75vh] overflow-y-auto">
              {/* Cashier & Session metadata */}
              <div className="grid grid-cols-2 gap-3.5 rounded-2xl bg-muted/40 dark:bg-[#0d121c] p-4 border border-border/50 dark:border-slate-800">
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground dark:text-slate-400">Cashier Name</span>
                  <p className="font-semibold text-foreground dark:text-slate-100 mt-0.5">
                    {selectedSession.cashierName || "Cashier"}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground dark:text-slate-400">Total Orders</span>
                  <p className="text-xs font-bold text-foreground dark:text-slate-100 mt-0.5">
                    {selectedSession.orderCount ?? 0} orders
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground dark:text-slate-400">Opened At</span>
                  <p className="text-xs font-medium text-foreground dark:text-slate-200 mt-0.5">
                    {formatDate(selectedSession.openedAt)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground dark:text-slate-400">Closed At</span>
                  <p className="text-xs font-medium text-foreground dark:text-slate-200 mt-0.5">
                    {selectedSession.status === "OPEN" ? (
                      <span className="text-primary font-semibold italic">In Progress (Open)</span>
                    ) : (
                      formatDate(selectedSession.closedAt)
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground dark:text-slate-400">Reconciliation</span>
                  <p className="text-xs font-semibold text-foreground dark:text-slate-200 mt-0.5">
                    {selectedSession.reconciliationStatus || (selectedSession.status === "OPEN" ? "IN_PROGRESS" : "CLOSED")}
                  </p>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="flex flex-col gap-2.5 border-t border-b border-border dark:border-slate-800 py-4">
                <div className="flex justify-between text-muted-foreground dark:text-slate-400">
                  <span>Opening Cash</span>
                  <span className="font-semibold text-foreground dark:text-slate-100">
                    {format(selectedSession.openingBalance, selectedSession.currency ?? undefined)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground dark:text-slate-400">
                  <span>Total Cash Sales</span>
                  <span className="font-semibold text-primary">
                    +{format(selectedSession.totalCashSales, selectedSession.currency ?? undefined)}
                  </span>
                </div>
                {selectedSession.totalPaidIn > 0 && (
                  <div className="flex justify-between text-muted-foreground dark:text-slate-400">
                    <span>Total Paid In (Added)</span>
                    <span className="font-semibold text-primary">
                      +{format(selectedSession.totalPaidIn, selectedSession.currency ?? undefined)}
                    </span>
                  </div>
                )}
                {selectedSession.totalPaidOut > 0 && (
                  <div className="flex justify-between text-muted-foreground dark:text-slate-400">
                    <span>Total Paid Out (Removed)</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      -{format(selectedSession.totalPaidOut, selectedSession.currency ?? undefined)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-border dark:border-slate-800 text-base font-bold">
                  <span className="text-foreground dark:text-white">Expected Total Cash</span>
                  <span className="text-primary">
                    {format(selectedSession.expectedAmount, selectedSession.currency ?? undefined)}
                  </span>
                </div>
                {selectedSession.actualAmount !== null && (
                  <div className="flex justify-between text-muted-foreground dark:text-slate-400 pt-1">
                    <span>Actual Counted Cash</span>
                    <span className="font-bold text-foreground dark:text-slate-100">
                      {format(selectedSession.actualAmount, selectedSession.currency ?? undefined)}
                    </span>
                  </div>
                )}
                {selectedSession.differenceAmount !== null && (
                  <div className="flex justify-between text-sm pt-1">
                    <span className="font-semibold text-foreground dark:text-slate-200">Cash Discrepancy</span>
                    <span
                      className={`font-bold ${
                        selectedSession.differenceAmount < 0
                          ? "text-red-600 dark:text-red-400"
                          : selectedSession.differenceAmount > 0
                            ? "text-primary"
                            : "text-muted-foreground dark:text-slate-400"
                      }`}
                    >
                      {selectedSession.differenceAmount >= 0 ? "+" : ""}
                      {format(selectedSession.differenceAmount, selectedSession.currency ?? undefined)}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedSession.note && (
                <div className="flex flex-col gap-1 rounded-xl bg-amber-50/80 dark:bg-amber-950/50 p-3 text-xs border border-amber-200/60 dark:border-amber-900/60">
                  <span className="font-bold text-amber-800 dark:text-amber-300">Session Note:</span>
                  <p className="text-amber-900 dark:text-amber-200">{selectedSession.note}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 border-t border-border dark:border-slate-800 px-6 py-4 bg-muted/30 dark:bg-[#0f1520]">
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="rounded-xl border border-border bg-card dark:bg-[#0d121c] dark:border-slate-800 px-4 py-2 text-xs font-semibold text-foreground dark:text-slate-200 hover:bg-accent dark:hover:bg-[#1c2638]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
