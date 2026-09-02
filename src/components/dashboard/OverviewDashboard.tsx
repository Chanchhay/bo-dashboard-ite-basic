"use client";

import { useMemo, useState } from "react";
import {
    DollarSign,
    ShoppingBag,
    Receipt,
    TrendingUp,
    PieChart as PieIcon,
    BarChart2,
    Layers,
    FolderTree,
    ArrowUpRight,
    RefreshCw,
    Download,
    Search,
    ArrowUpDown,
    MoreHorizontal,
    ChevronLeft,
    ChevronRight,
    FileText,
    FileSpreadsheet,
    FileType,
    Loader2,
} from "lucide-react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";

import { useMoney } from "@/hooks/useMoney";
import {
    useGetDailyRevenueByChannelQuery,
    useGetSalesProfitQuery,
    useGetPeriodProfitQuery,
    useGetItemProfitQuery,
} from "@/services/salesReportApi";
import { useGetReceiptsQuery } from "@/services/posOrderApi";
import { useGetCustomersQuery } from "@/services/customerApi";
import { toLocalDateTime, periodLabel, type OrderChannelCode, type ReportGranularity } from "@/lib/api/sales-report";
import type { InventoryItem, StockSummary } from "@/lib/api/inventory";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

interface OverviewDashboardProps {
    items?: InventoryItem[];
    stock?: StockSummary[];
}

// Color Palette for Channels matching system theme tokens
const CHANNEL_COLORS: Record<string, string> = {
    POS: "#00932a",       // Green (swapped with Telegram)
    WEB: "#eda100",       // Yellow (swapped with Messenger)
    TELEGRAM: "#d14341",  // Red (swapped with POS)
    MESSENGER: "#2a78d6", // Blue (swapped with Web)
};

const stockChartConfig = {
    totalAmount: {
        label: "Total Revenue",
        color: "var(--primary)",
    },
    itemCount: {
        label: "Item Count",
        color: "#feb90d",
    },
} satisfies ChartConfig;

type CapturedChart = { dataUrl: string; width: number; height: number };

// Renders a dashboard card to a PNG data URI for embedding in exported reports (Excel/Word).
// Strips SVG glow filters first — html2canvas rasterizes them as a muddy smear instead of a soft glow.
// Returns the canvas's real pixel dimensions too, so callers can size the <img> without
// distorting it — Word/Excel's HTML importer stretches images when only one dimension is set.
async function captureChartImage(selector: string): Promise<CapturedChart | null> {
    const el = document.querySelector(selector);
    if (!el) return null;
    const canvas = await html2canvas(el as HTMLElement, {
        scale: 1.5,
        logging: false,
        onclone: (clonedDoc) => {
            clonedDoc.querySelectorAll("[filter]").forEach((node) => node.removeAttribute("filter"));
            clonedDoc.querySelectorAll<HTMLElement>("[style*='filter']").forEach((node) => {
                node.style.filter = "none";
            });
        },
    });
    return { dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height };
}

// Builds an <img> tag with an explicit width/height (derived from the real capture aspect
// ratio) at the given display width, so it renders at a clean, undistorted size.
function chartImgTag(chart: CapturedChart | null, filename: string, displayWidth: number, style = ""): string {
    if (!chart) return "";
    const displayHeight = Math.round((chart.height / chart.width) * displayWidth);
    return `<img src="${filename}" width="${displayWidth}" height="${displayHeight}" style="border:1px solid #d9d9d9; border-radius: 8px; ${style}" />`;
}

export function OverviewDashboard({ items = [], stock = [] }: OverviewDashboardProps) {
    const { format } = useMoney();
    const [now] = useState(() => new Date());
    const [granularity, setGranularity] = useState<ReportGranularity>("DAY");

    const fromDate = useMemo(() => {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        return toLocalDateTime(d);
    }, [now]);

    const toDate = useMemo(() => toLocalDateTime(now), [now]);

    // Live backend queries
    const salesProfitQuery = useGetSalesProfitQuery({});
    const periodProfitQuery = useGetPeriodProfitQuery({ granularity });
    const itemProfitQuery = useGetItemProfitQuery({});
    const receiptsQuery = useGetReceiptsQuery({ size: 50 });
    const customersQuery = useGetCustomersQuery();

    // Aggregate Top 4 KPI Values directly from backend API response & props
    const kpiData = useMemo(() => {
        const total = salesProfitQuery.data?.total;

        // Total items count — the business's real catalog size
        const totalItemsCount = items.length;

        // Total categories count — distinct item groups actually in use
        const categoriesSet = new Set(items.map((i) => i.itemGroup?.name).filter(Boolean));
        const totalCategoriesCount = categoriesSet.size;

        // Total inventory quantity currently on hand
        const inventoryCount = stock.reduce((acc, s) => acc + (s.quantityOnHand || 0), 0);

        return {
            revenue: total?.revenue ?? 0,
            totalItem: totalItemsCount,
            totalCategory: totalCategoriesCount,
            inventory: inventoryCount,
        };
    }, [salesProfitQuery.data, items, stock]);

    // 1. Cumulative Profit: Running-Sum Accumulator Algorithm with Monotone Spline
    const cumulativeProfitData = useMemo(() => {
        const periods = periodProfitQuery.data?.periods;
        if (!periods || periods.length === 0) return [];

        // The API answers newest-first; a running total only means something
        // walking forward through time, and the chart has to draw left-to-right
        // the same way or it reads backwards.
        const chronological = [...periods].sort((a, b) => {
            if (!a.periodStart) return -1;
            if (!b.periodStart) return 1;
            return a.periodStart.localeCompare(b.periodStart);
        });

        let runningSum = 0;
        return chronological.map((p) => {
            runningSum += p.profit;
            let dateStr = p.periodStart ? periodLabel(p.periodStart, granularity) : "Date";
            dateStr = dateStr.replace(/^Week of /i, "").replace(/ \d{4}$/, "");
            return {
                date: dateStr,
                fullDate: p.periodStart ? periodLabel(p.periodStart, granularity) : "Date",
                profit: p.profit,
                cumulative: runningSum,
            };
        });
    }, [periodProfitQuery.data, granularity]);

    // 2. Percentage of Channel: Proportional Relative-Frequency Distribution Algorithm
    const channelPercentageData = useMemo(() => {
        const channels = salesProfitQuery.data?.channels;
        if (!channels || channels.length === 0) return [];

        const totalRevenue = channels.reduce((acc, c) => acc + (c.revenue || 0), 0);
        if (totalRevenue === 0) return [];

        return channels.map((c) => {
            const channelName = (c.channel || "OTHER").toUpperCase();
            const revenue = c.revenue || 0;
            const relativeFreq = revenue / totalRevenue;
            const pct = Math.round(relativeFreq * 100);
            return {
                name: channelName,
                value: pct > 0 ? pct : 1,
                revenue,
                color: CHANNEL_COLORS[channelName] || "#64748b",
            };
        });
    }, [salesProfitQuery.data]);

    // 3. Total Amount of Item Type: 2 Metrics (Sum of item_count & Sum of total_amount)
    const itemVectorData = useMemo(() => {
        const itemsList = itemProfitQuery.data?.items;
        if (!itemsList || itemsList.length === 0) return [];

        return itemsList
            .filter((item) => item.itemId !== null)
            .slice()
            .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
            .slice(0, 6)
            .map((item) => {
                const rawName = item.itemName || item.variantName || "Item";
                return {
                    name: rawName.length > 12 ? rawName.slice(0, 12) + "..." : rawName,
                    itemCount: item.quantitySold || 0,
                    totalAmount: Math.round(item.revenue || 0),
                };
            });
    }, [itemProfitQuery.data]);

    // 4. Stock Inventory: Top-K Sorting Algorithm O(N log N)
    const stockInventoryData = useMemo(() => {
        if (items.length === 0 || stock.length === 0) return [];

        const qtyMap = stock.reduce((map, entry) => {
            if (entry.itemId) {
                map.set(entry.itemId, (map.get(entry.itemId) || 0) + (entry.quantityOnHand || 0));
            }
            return map;
        }, new Map<string, number>());

        return items
            .map((i) => {
                const itemName = i.name || "Unnamed Item";
                const itemPrice = i.price ?? 0;
                const qty = qtyMap.get(i.id) || 0;
                return {
                    name: itemName,
                    totalAmount: Math.round(qty * itemPrice),
                    itemCount: qty,
                };
            })
            .filter((i) => i.itemCount > 0)
            .sort((a, b) => b.itemCount - a.itemCount) // Top-K Sorting Algorithm O(N log N)
            .slice(0, 5); // Top K items
    }, [items, stock]);

    const { maxStockRevenue, maxStockCount } = useMemo(() => {
        let maxRev = 0;
        let maxCnt = 0;
        for (const item of stockInventoryData) {
            if (item.totalAmount > maxRev) maxRev = item.totalAmount;
            if (item.itemCount > maxCnt) maxCnt = item.itemCount;
        }
        return { maxStockRevenue: maxRev || 1, maxStockCount: maxCnt || 1 };
    }, [stockInventoryData]);

    const monthYearLabel = useMemo(() => {
        return now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }, [now]);

    const [recentOrderFilter, setRecentOrderFilter] = useState("");
    const [bestSellingFilter, setBestSellingFilter] = useState("");
    const [recentOrderPage, setRecentOrderPage] = useState(1);
    const [bestSellingPage, setBestSellingPage] = useState(1);

    const ITEMS_PER_PAGE = 5;

    // Map customers by ID for real profile names & avatars
    const customerMap = useMemo(() => {
        const map = new Map<string, { name: string; avatarUrl?: string; initials: string }>();
        if (customersQuery.data) {
            for (const c of customersQuery.data) {
                const rawName = c.globalCustomer?.fullName || (c as any).fullName || (c as any).name;
                const fullName = rawName && rawName.toLowerCase() !== "customer"
                    ? rawName
                    : c.globalCustomer?.email
                        ? c.globalCustomer.email.split("@")[0]
                        : "";
                if (fullName) {
                    const initials = fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "CU";
                    map.set(c.id, { name: fullName, avatarUrl: (c as any).avatarUrl || (c as any).photoUrl, initials });
                }
            }
        }
        return map;
    }, [customersQuery.data]);

    // Recent Orders Data (Real backend API order receipts)
    const recentOrders = useMemo(() => {
        const apiOrders = receiptsQuery.data?.content;

        let list: Array<{
            id: string;
            customer: string;
            avatar: string;
            avatarUrl?: string;
            product: string;
            category: string;
            amount: number;
            status: string;
        }> = [];

        if (apiOrders && apiOrders.length > 0) {
            list = apiOrders.map((o) => {
                const custInfo = o.customerId ? customerMap.get(o.customerId) : null;
                const customerName = custInfo?.name || "Walk-in Customer";
                const avatarInitials = custInfo?.initials || "WC";

                const firstItemName =
                    o.items && o.items.length > 0
                        ? o.items.length > 1
                            ? `${o.items[0].itemName} +${o.items.length - 1} more`
                            : o.items[0].itemName
                        : "—";

                let formattedStatus = "Processing";
                if (o.status === "PAID") formattedStatus = "Paid";
                else if (o.status === "CONFIRMED") formattedStatus = "Success";
                else if (o.status === "FAILED" || o.status === "CANCELLED") formattedStatus = "Failed";
                else if (o.status === "PENDING") formattedStatus = "Processing";

                const displayId = o.invoiceNumber ? (o.invoiceNumber.startsWith("#") ? o.invoiceNumber : `#${o.invoiceNumber}`) : `#${o.id.slice(-4)}`;

                const firstItemCategory =
                    o.items && o.items.length > 0
                        ? (o.items[0] as any).itemGroup?.name || (items.find((i) => i.name === o.items[0].itemName)?.itemGroup?.name) || "General"
                        : "General";

                return {
                    id: displayId,
                    customer: customerName,
                    avatar: avatarInitials,
                    avatarUrl: custInfo?.avatarUrl,
                    product: firstItemName,
                    category: firstItemCategory,
                    amount: o.total || 0,
                    status: formattedStatus,
                };
            });
        }

        if (!recentOrderFilter.trim()) return list;
        const query = recentOrderFilter.toLowerCase();
        return list.filter(
            (o) =>
                o.customer.toLowerCase().includes(query) ||
                o.product.toLowerCase().includes(query) ||
                o.id.toLowerCase().includes(query) ||
                o.status.toLowerCase().includes(query)
        );
    }, [receiptsQuery.data, customerMap, recentOrderFilter]);

    const paginatedRecentOrders = useMemo(() => {
        const start = (recentOrderPage - 1) * ITEMS_PER_PAGE;
        return recentOrders.slice(start, start + ITEMS_PER_PAGE);
    }, [recentOrders, recentOrderPage]);

    // Best Selling Products Data — real catalog items ranked by real sales revenue
    const bestSellingProducts = useMemo(() => {
        const profitByItemId = new Map<string, { revenue: number; quantitySold: number }>();
        for (const p of itemProfitQuery.data?.items ?? []) {
            if (!p.itemId) continue;
            const existing = profitByItemId.get(p.itemId);
            profitByItemId.set(p.itemId, {
                revenue: (existing?.revenue ?? 0) + (p.revenue || 0),
                quantitySold: (existing?.quantitySold ?? 0) + (p.quantitySold || 0),
            });
        }

        let result: Array<{ id: string; name: string; category: string; sales: number; sold: number; image?: string }>;

        if (items.length > 0) {
            result = items.map((item) => {
                const sold = item.id ? profitByItemId.get(item.id) : undefined;
                return {
                    id: item.id,
                    name: item.name || "Product",
                    category: item.itemGroup?.name || (item as any).category || "General",
                    sales: sold?.revenue ?? 0,
                    sold: sold?.quantitySold ?? 0,
                    image: item.images?.[0]?.url || item.colors?.[0]?.imageUrl || item.variants?.[0]?.imageUrl || undefined,
                };
            });
        } else {
            result = (itemProfitQuery.data?.items ?? [])
                .filter((item) => item.itemId !== null)
                .map((item) => ({
                    id: item.itemId as string,
                    name: item.itemName || item.variantName || "Product",
                    category: "General",
                    sales: item.revenue || 0,
                    sold: item.quantitySold || 0,
                }));
        }

        result = result.slice().sort((a, b) => b.sales - a.sales);

        if (!bestSellingFilter.trim()) return result;
        const query = bestSellingFilter.toLowerCase();
        return result.filter((p) => p.name.toLowerCase().includes(query));
    }, [items, itemProfitQuery.data, bestSellingFilter]);

    const paginatedBestSellingProducts = useMemo(() => {
        const start = (bestSellingPage - 1) * ITEMS_PER_PAGE;
        return bestSellingProducts.slice(start, start + ITEMS_PER_PAGE);
    }, [bestSellingProducts, bestSellingPage]);

    const handleExportRecentOrders = () => {
        const headers = ["Order ID", "Customer", "Product", "Category", "Amount ($)", "Status"];
        const rows = recentOrders.map((o) => [o.id, o.customer, o.product, o.category, o.amount, o.status]);

        const csvContent = [
            headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
            ...rows.map((row) =>
                row
                    .map((cell) => {
                        const str = String(cell ?? "");
                        return `"${str.replace(/"/g, '""')}"`;
                    })
                    .join(",")
            ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "recent-orders.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleExportBestSelling = () => {
        const headers = ["Product", "Category", "Total Sales ($)", "Units Sold"];
        const rows = bestSellingProducts.map((p) => [p.name, p.category, p.sales, p.sold]);

        const csvContent = [
            headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
            ...rows.map((row) =>
                row
                    .map((cell) => {
                        const str = String(cell ?? "");
                        return `"${str.replace(/"/g, '""')}"`;
                    })
                    .join(",")
            ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "best-selling-products.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const [isExportingPdf, setIsExportingPdf] = useState(false);

    const handleExportPDF = async () => {
        const dashboardEl = document.getElementById("dashboard-container");
        if (!dashboardEl) return;

        try {
            setIsExportingPdf(true);
            await new Promise((r) => setTimeout(r, 150));

            const canvas = await html2canvas(dashboardEl, {
                scale: 3, // Ultra-high resolution 3x rendering for crisp text & sharp charts
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff", // Print report on a clean white page, not the app's gray shell backdrop
                onclone: (clonedDoc) => {
                    // 1. Hide export action toolbar from PDF report printout
                    const toolbar = clonedDoc.querySelector("[data-pdf-ignore='true']");
                    if (toolbar) {
                        (toolbar as HTMLElement).style.display = "none";
                    }

                    // Force a clean white page background — the live dashboard's gray shell
                    // backdrop looks like a dull tint once printed to a PDF page.
                    clonedDoc.body.style.backgroundColor = "#ffffff";
                    const dashboardClone = clonedDoc.getElementById("dashboard-container");
                    if (dashboardClone) {
                        dashboardClone.style.backgroundColor = "#ffffff";
                    }

                    // 2. Inject Executive PDF Header into cloned document
                    const container = clonedDoc.getElementById("dashboard-container");
                    if (container) {
                        const dateStr = new Date().toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                        });

                        const header = clonedDoc.createElement("div");
                        header.style.display = "flex";
                        header.style.justifyContent = "space-between";
                        header.style.alignItems = "center";
                        header.style.paddingBottom = "12px";
                        header.style.marginBottom = "16px";
                        header.style.borderBottom = "2px solid #00932a";

                        header.innerHTML = `
                          <div>
                            <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; font-family: system-ui, -apple-system, sans-serif;">BUSINESS DASHBOARD OVERVIEW</h1>
                            <p style="font-size: 11px; color: #64748b; margin: 4px 0 0 0; font-family: system-ui, -apple-system, sans-serif;">Executive Analytics Report &bull; Generated on ${dateStr}</p>
                          </div>
                          <div style="text-align: right;">
                            <span style="background-color: #00932a; color: #ffffff; font-size: 10px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; font-family: system-ui, -apple-system, sans-serif; letter-spacing: 0.5px;">EXECUTIVE REPORT</span>
                          </div>
                        `;

                        container.insertBefore(header, container.firstChild);
                    }

                    // 3. Strip SVG glow filters (feGaussianBlur) — html2canvas rasterizes them
                    // as a muddy smear instead of a soft glow, so drop them for the static export.
                    clonedDoc.querySelectorAll("[filter]").forEach((el) => el.removeAttribute("filter"));
                    clonedDoc.querySelectorAll<HTMLElement>("[style*='filter']").forEach((el) => {
                        el.style.filter = "none";
                    });
                },
            });

            const imgData = canvas.toDataURL("image/png");

            // Size the page to the content itself (fixed A4 width, dynamic height) so the
            // whole report fits on a single page instead of being cut across multiple pages.
            const margin = 6; // Tight 6mm margins for full-width presentation
            const pageWidth = 210; // A4 width in mm
            const imgWidth = pageWidth - margin * 2;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const pageHeight = imgHeight + margin * 2;

            const pdf = new jsPDF({
                orientation: pageHeight >= pageWidth ? "p" : "l",
                unit: "mm",
                format: [pageWidth, pageHeight],
            });

            pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight, undefined, "FAST");

            const dateStr = new Date().toISOString().split("T")[0];
            pdf.save(`business-dashboard-report-${dateStr}.pdf`);
        } catch (err) {
            console.error("Failed to export high-res PDF:", err);
        } finally {
            setIsExportingPdf(false);
        }
    };

    const [isExportingDocs, setIsExportingDocs] = useState(false);

    const handleExportDocs = async () => {
        try {
            setIsExportingDocs(true);
            await new Promise((r) => setTimeout(r, 100));

            const pieChartImg = await captureChartImage("[data-tour='dashboard-channel-cards']");
            const profitChartImg = await captureChartImage("[data-tour='dashboard-cumulative-profit']");
            const barChartImg = await captureChartImage("[data-tour='dashboard-item-vector']");
            const stockChartImg = await captureChartImage("[data-tour='dashboard-stock-on-hand']");

            const dateStr = new Date().toISOString().split("T")[0];
            const generatedOn = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

            const section = (title: string, bodyHtml: string) => `
              <h2 style="font-size: 15px; font-weight: 700; color: #1f4e79; border-bottom: 1px solid #d9e1f2; padding-bottom: 6px; margin: 26px 0 12px 0;">${title}</h2>
              ${bodyHtml}
            `;

            const dataTable = (headers: string[], rows: (string | number)[][]) => `
              <table cellspacing="0" cellpadding="0" style="border-collapse: collapse; width: 100%;">
                <tr>${headers.map((h) => `<td class="header-cell">${h}</td>`).join("")}</tr>
                ${rows.map((row) => `<tr>${row.map((cell) => `<td class="data-cell">${cell}</td>`).join("")}</tr>`).join("")}
              </table>
            `;

            const docHtml = `
              <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 12px; color: #1f2937; margin: 30px; }
                  .header-cell { background-color: #d9e1f2; color: #000000; font-weight: bold; border: 1px solid #b4c6e7; padding: 6px 10px; font-size: 12px; text-align: left; }
                  .data-cell { border: 1px solid #e0e0e0; font-size: 11px; padding: 5px 10px; }
                  .kpi-cell { border: 1px solid #b4c6e7; background-color: #f2f4f8; text-align: center; padding: 10px; }
                  .kpi-label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
                  .kpi-val { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 4px; }
                </style>
              </head>
              <body>
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #00932a; padding-bottom: 12px; margin-bottom: 20px;">
                  <div>
                    <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0;">BUSINESS DASHBOARD OVERVIEW</h1>
                    <p style="font-size: 11px; color: #64748b; margin: 4px 0 0 0;">Executive Analytics Report &bull; Generated on ${generatedOn}</p>
                  </div>
                  <span style="background-color: #00932a; color: #ffffff; font-size: 10px; font-weight: 700; padding: 4px 12px; border-radius: 9999px;">EXECUTIVE REPORT</span>
                </div>

                <table cellspacing="0" cellpadding="0" style="border-collapse: collapse; width: 100%;">
                  <tr>
                    <td class="kpi-cell"><div class="kpi-label">Total Revenue</div><div class="kpi-val">$${kpiData.revenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div></td>
                    <td class="kpi-cell"><div class="kpi-label">Total Items</div><div class="kpi-val">${kpiData.totalItem.toLocaleString("en-US")}</div></td>
                    <td class="kpi-cell"><div class="kpi-label">Total Categories</div><div class="kpi-val">${kpiData.totalCategory.toLocaleString("en-US")}</div></td>
                    <td class="kpi-cell"><div class="kpi-label">Total Inventory</div><div class="kpi-val">${kpiData.inventory.toLocaleString("en-US")}</div></td>
                  </tr>
                </table>

                ${section("Percentage of Channel", `
                  ${chartImgTag(pieChartImg, "pieChart.png", 300, "margin-bottom: 12px;")}
                  ${dataTable(
                      ["Channel", "Revenue ($)", "Revenue Share (%)"],
                      channelPercentageData.map((c) => [c.name, `$${c.revenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, `${c.value}%`]),
                  )}
                `)}

                ${section("Cumulative Profit", `
                  ${chartImgTag(profitChartImg, "profitChart.png", 460, "margin-bottom: 12px;")}
                  ${dataTable(
                      ["Period", "Period Profit ($)", "Cumulative Profit ($)"],
                      cumulativeProfitData.map((p) => [p.fullDate, `$${p.profit.toFixed(2)}`, `$${p.cumulative.toFixed(2)}`]),
                  )}
                `)}

                ${section("Total Amount of Item Type", `
                  ${chartImgTag(barChartImg, "barChart.png", 460, "margin-bottom: 12px;")}
                  ${dataTable(
                      ["Item Name", "Quantity Sold", "Total Amount ($)"],
                      itemVectorData.map((iv) => [iv.name, iv.itemCount, `$${iv.totalAmount.toFixed(2)}`]),
                  )}
                `)}

                ${section("Stock Inventory", `
                  ${chartImgTag(stockChartImg, "stockChart.png", 300, "margin-bottom: 12px;")}
                  ${dataTable(
                      ["Item Name", "Quantity On Hand", "Total Value ($)"],
                      stockInventoryData.map((st) => [st.name, st.itemCount, `$${st.totalAmount.toFixed(2)}`]),
                  )}
                `)}

                ${section("Recent Orders", dataTable(
                    ["Order ID", "Customer", "Product", "Category", "Amount ($)", "Status"],
                    recentOrders.map((o) => [o.id, o.customer, o.product, o.category, `$${o.amount.toFixed(2)}`, o.status]),
                ))}

                ${section("Best Selling Products", dataTable(
                    ["Product Name", "Category", "Total Sales ($)", "Units Sold"],
                    bestSellingProducts.map((bp) => [bp.name, bp.category, `$${bp.sales.toFixed(2)}`, bp.sold]),
                ))}
              </body>
              </html>
            `;

            // Word's HTML importer can't resolve `data:` image URIs \u2014 package the report as
            // an MHTML (multipart/related) archive instead, same as the Excel export, with
            // each chart image as its own MIME part.
            const boundary = "----=DocsReportBoundary";
            const mhtmlParts: string[] = [
                "MIME-Version: 1.0",
                `Content-Type: multipart/related; boundary="${boundary}"`,
                "",
                `--${boundary}`,
                'Content-Type: text/html; charset="utf-8"',
                "Content-Location: report.html",
                "",
                docHtml,
                "",
            ];

            const addImagePart = (chart: CapturedChart | string, filename: string) => {
                const dataUrl = typeof chart === "string" ? chart : chart.dataUrl;
                const base64 = dataUrl.split(",")[1] ?? "";
                mhtmlParts.push(
                    `--${boundary}`,
                    "Content-Type: image/png",
                    "Content-Transfer-Encoding: base64",
                    `Content-Location: ${filename}`,
                    "",
                    base64,
                    "",
                );
            };

            if (pieChartImg) addImagePart(pieChartImg, "pieChart.png");
            if (profitChartImg) addImagePart(profitChartImg, "profitChart.png");
            if (barChartImg) addImagePart(barChartImg, "barChart.png");
            if (stockChartImg) addImagePart(stockChartImg, "stockChart.png");

            mhtmlParts.push(`--${boundary}--`);

            const blob = new Blob([mhtmlParts.join("\r\n")], { type: "application/msword;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `dashboard-report-${dateStr}.doc`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to export Docs report:", err);
        } finally {
            setIsExportingDocs(false);
        }
    };

    const [isExportingExcel, setIsExportingExcel] = useState(false);

    const handleExportExcel = async () => {
        try {
            setIsExportingExcel(true);
            await new Promise((r) => setTimeout(r, 100));

            const pieChartImg = await captureChartImage("[data-tour='dashboard-channel-cards']");
            const profitChartImg = await captureChartImage("[data-tour='dashboard-cumulative-profit']");
            const barChartImg = await captureChartImage("[data-tour='dashboard-item-vector']");
            const stockChartImg = await captureChartImage("[data-tour='dashboard-stock-on-hand']");

            const totalChannelRev = channelPercentageData.reduce((acc, c) => acc + c.revenue, 0) || 1;
            const totalOrdersCount = (receiptsQuery.data as any)?.totalElements ?? recentOrders.length;
            const dateStr = new Date().toISOString().split("T")[0];

            const excelHtml = `
              <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; margin: 20px; }
                  .kpi-card { background-color: #2b579a; color: #ffffff; font-family: Calibri, sans-serif; text-align: center; vertical-align: middle; border: 1px solid #1e3d6f; }
                  .kpi-title { font-size: 11px; font-weight: bold; padding-top: 6px; }
                  .kpi-val { font-size: 18px; font-weight: bold; padding-bottom: 8px; }
                  .header-cell { background-color: #d9e1f2; color: #000000; font-weight: bold; border: 1px solid #b4c6e7; padding: 6px 10px; font-size: 12px; }
                  .header-num { background-color: #d9e1f2; color: #000000; font-weight: bold; border: 1px solid #b4c6e7; padding: 6px 10px; font-size: 12px; text-align: right; }
                  .data-cell { border: 1px solid #e0e0e0; font-size: 11px; padding: 5px 10px; }
                  .data-num { border: 1px solid #e0e0e0; font-size: 11px; padding: 5px 10px; text-align: right; }
                  .total-cell { font-weight: bold; background-color: #f2f4f8; border-top: 1.5pt solid #2b579a; border-bottom: 2pt double #2b579a; padding: 6px 10px; font-size: 11px; }
                  .total-num { font-weight: bold; background-color: #f2f4f8; border-top: 1.5pt solid #2b579a; border-bottom: 2pt double #2b579a; padding: 6px 10px; font-size: 11px; text-align: right; }
                  .section-title { font-size: 14px; font-weight: bold; color: #1f4e79; padding-bottom: 8px; margin-top: 10px; }
                </style>
              </head>
              <body>
                <table>
                  <!-- TOP KPI CARDS (MATCHING EXCEL DASHBOARD MOCKUP) -->
                  <tr>
                    <td colspan="2" class="kpi-card kpi-title">TOTAL REVENUE</td>
                    <td></td>
                    <td colspan="2" class="kpi-card kpi-title">UNITS SOLD / INVENTORY</td>
                    <td></td>
                    <td colspan="2" class="kpi-card kpi-title">TOTAL ORDERS</td>
                  </tr>
                  <tr>
                    <td colspan="2" class="kpi-card kpi-val">$${kpiData.revenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                    <td></td>
                    <td colspan="2" class="kpi-card kpi-val">${kpiData.inventory.toLocaleString("en-US")}</td>
                    <td></td>
                    <td colspan="2" class="kpi-card kpi-val">${totalOrdersCount.toLocaleString("en-US")}</td>
                  </tr>
                  <tr><td colspan="8" style="height: 15px;"></td></tr>

                  <!-- MAIN TABLES & EMBEDDED CHARTS -->
                  <tr>
                    <!-- LEFT SIDE TABLES -->
                    <td colspan="4" valign="top">
                      <!-- 1. SALES BY CHANNEL / CUSTOMER TYPE -->
                      <table cellspacing="0" cellpadding="0" style="border-collapse: collapse; width: 100%;">
                        <tr>
                          <td class="header-cell">Sales by Channel / Customer</td>
                          <td class="header-num">Sum of Total Sales ($)</td>
                          <td class="header-num">% of Share</td>
                        </tr>
                        ${channelPercentageData.map(c => `
                          <tr>
                            <td class="data-cell">${c.name}</td>
                            <td class="data-num">$${c.revenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                            <td class="data-num">${((c.revenue / totalChannelRev) * 100).toFixed(2)}%</td>
                          </tr>
                        `).join("")}
                        <tr>
                          <td class="total-cell">Grand Total</td>
                          <td class="total-num">$${totalChannelRev.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                          <td class="total-num">100.00%</td>
                        </tr>
                      </table>

                      <br/><br/>

                      <!-- 2. SALE BY CATEGORY / TOP ITEMS -->
                      <table cellspacing="0" cellpadding="0" style="border-collapse: collapse; width: 100%;">
                        <tr>
                          <td class="header-cell">Sale by Category / Item</td>
                          <td class="header-num">Sum of Total Sales ($)</td>
                          <td class="header-num">% of Share</td>
                        </tr>
                        ${itemVectorData.map(iv => {
                          const totalItemRev = itemVectorData.reduce((acc, i) => acc + i.totalAmount, 0) || 1;
                          const pct = (iv.totalAmount / totalItemRev) * 100;
                          return `
                            <tr>
                              <td class="data-cell">${iv.name}</td>
                              <td class="data-num">$${iv.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                              <td class="data-num">${pct.toFixed(2)}%</td>
                            </tr>
                          `;
                        }).join("")}
                        <tr>
                          <td class="total-cell">Grand Total</td>
                          <td class="total-num">$${itemVectorData.reduce((acc, i) => acc + i.totalAmount, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                          <td class="total-num">100.00%</td>
                        </tr>
                      </table>
                    </td>

                    <!-- RIGHT SIDE EMBEDDED CHARTS (laid out to mirror the live dashboard grid) -->
                    <td colspan="2" valign="top" style="padding-left: 20px;">
                      ${pieChartImg ? `
                        <div class="section-title">Percentage of Channel</div>
                        ${chartImgTag(pieChartImg, "pieChart.png", 260)}
                      ` : ''}
                    </td>

                    <td colspan="2" valign="top" style="padding-left: 20px;">
                      ${stockChartImg ? `
                        <div class="section-title">Stock Inventory</div>
                        ${chartImgTag(stockChartImg, "stockChart.png", 260)}
                      ` : ''}
                    </td>

                    <td colspan="4" valign="top" style="padding-left: 20px;">
                      ${profitChartImg ? `
                        <div class="section-title">Cumulative Profit</div>
                        ${chartImgTag(profitChartImg, "profitChart.png", 380, "margin-bottom: 16px;")}
                      ` : ''}
                      ${barChartImg ? `
                        <div class="section-title">Total Amount of Item Type</div>
                        ${chartImgTag(barChartImg, "barChart.png", 380)}
                      ` : ''}
                    </td>
                  </tr>
                  <tr><td colspan="8" style="height: 20px;"></td></tr>

                  <!-- RECENT ORDERS & BEST SELLING PRODUCTS -->
                  <tr>
                    <td colspan="6" valign="top">
                      <div class="section-title">Recent Orders</div>
                      <table cellspacing="0" cellpadding="0" style="border-collapse: collapse; width: 100%;">
                        <tr>
                          <td class="header-cell">Order ID</td>
                          <td class="header-cell">Customer</td>
                          <td class="header-cell">Product</td>
                          <td class="header-cell">Category</td>
                          <td class="header-num">Amount ($)</td>
                          <td class="header-cell">Status</td>
                        </tr>
                        ${recentOrders.map((o) => `
                          <tr>
                            <td class="data-cell">${o.id}</td>
                            <td class="data-cell">${o.customer}</td>
                            <td class="data-cell">${o.product}</td>
                            <td class="data-cell">${o.category}</td>
                            <td class="data-num">$${o.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                            <td class="data-cell">${o.status}</td>
                          </tr>
                        `).join("")}
                      </table>
                    </td>

                    <td colspan="2" valign="top" style="padding-left: 20px;">
                      <div class="section-title">Best Selling Products</div>
                      <table cellspacing="0" cellpadding="0" style="border-collapse: collapse; width: 100%;">
                        <tr>
                          <td class="header-cell">Product Name</td>
                          <td class="header-cell">Category</td>
                          <td class="header-num">Sales ($)</td>
                          <td class="header-num">Sold</td>
                        </tr>
                        ${bestSellingProducts.map((p) => `
                          <tr>
                            <td class="data-cell">${p.name}</td>
                            <td class="data-cell">${p.category}</td>
                            <td class="data-num">$${p.sales.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                            <td class="data-num">${p.sold.toLocaleString("en-US")}</td>
                          </tr>
                        `).join("")}
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
              </html>
            `;

            // Excel's HTML importer can't resolve `data:` image URIs — it treats them as
            // broken external links. Package the report as an MHTML (multipart/related)
            // archive instead, with each chart image as its own MIME part, which Excel
            // opens and embeds natively.
            const boundary = "----=ExcelReportBoundary";
            const mhtmlParts: string[] = [
                "MIME-Version: 1.0",
                `Content-Type: multipart/related; boundary="${boundary}"`,
                "",
                `--${boundary}`,
                'Content-Type: text/html; charset="utf-8"',
                "Content-Location: report.html",
                "",
                excelHtml,
                "",
            ];

            const addImagePart = (chart: CapturedChart | string, filename: string) => {
                const dataUrl = typeof chart === "string" ? chart : chart.dataUrl;
                const base64 = dataUrl.split(",")[1] ?? "";
                mhtmlParts.push(
                    `--${boundary}`,
                    "Content-Type: image/png",
                    "Content-Transfer-Encoding: base64",
                    `Content-Location: ${filename}`,
                    "",
                    base64,
                    "",
                );
            };

            if (pieChartImg) addImagePart(pieChartImg, "pieChart.png");
            if (profitChartImg) addImagePart(profitChartImg, "profitChart.png");
            if (barChartImg) addImagePart(barChartImg, "barChart.png");
            if (stockChartImg) addImagePart(stockChartImg, "stockChart.png");

            mhtmlParts.push(`--${boundary}--`);

            const blob = new Blob([mhtmlParts.join("\r\n")], { type: "application/vnd.ms-excel;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `dashboard-excel-report-${dateStr}.xls`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to export Excel report:", err);
        } finally {
            setIsExportingExcel(false);
        }
    };

    const isDashboardLoading = salesProfitQuery.isLoading && periodProfitQuery.isLoading && itemProfitQuery.isLoading;

    if (isDashboardLoading) {
        return <DashboardSkeleton />;
    }

    return (
        <div id="dashboard-container" data-tour="dashboard-overview" className="flex flex-col gap-6 pb-6 animate-in fade-in duration-300">
            {/* Dashboard Actions Bar: Export PDF, Export Excel Report, Export Docs */}
            <div data-pdf-ignore="true" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
                <div>
                    <h3 className="text-sm font-bold text-foreground">Dashboard Export & Reports</h3>
                    <p className="text-xs text-muted-foreground">Export visual PDF, formatted Excel (.xls) with embedded charts & tables, or a Word (.doc) report</p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleExportPDF}
                        disabled={isExportingPdf}
                        className="h-10 gap-2 rounded-xl border-border/80 font-bold shadow-xs hover:border-primary hover:bg-primary/5 hover:text-primary transition-all"
                    >
                        {isExportingPdf ? (
                            <Loader2 className="size-4 animate-spin text-primary" />
                        ) : (
                            <FileText className="size-4 text-rose-500" />
                        )}
                        <span>{isExportingPdf ? "Generating PDF..." : "Export PDF"}</span>
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleExportExcel}
                        disabled={isExportingExcel}
                        className="h-10 gap-2 rounded-xl border-border/80 font-bold shadow-xs hover:border-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600 transition-all"
                    >
                        {isExportingExcel ? (
                            <Loader2 className="size-4 animate-spin text-emerald-600" />
                        ) : (
                            <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                        <span>{isExportingExcel ? "Generating Excel..." : "Export Excel (.xls)"}</span>
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleExportDocs}
                        disabled={isExportingDocs}
                        className="h-10 gap-2 rounded-xl border-border/80 font-bold shadow-xs hover:border-blue-600 hover:bg-blue-500/10 hover:text-blue-600 transition-all"
                    >
                        {isExportingDocs ? (
                            <Loader2 className="size-4 animate-spin text-blue-600" />
                        ) : (
                            <FileType className="size-4 text-blue-600 dark:text-blue-400" />
                        )}
                        <span>{isExportingDocs ? "Generating Docs..." : "Export Docs"}</span>
                    </Button>
                </div>
            </div>

            {/* KPI Metric Cards Row (Top 3) */}
            <div data-tour="dashboard-stats" className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* 1. TOTAL REVENUE */}
                <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
                    <CardHeader className="p-0 space-y-0 flex flex-row items-start justify-between">
                        <div>
                            <CardDescription className="text-xs sm:text-sm font-black uppercase tracking-wider text-muted-foreground">
                                TOTAL REVENUE
                            </CardDescription>
                            <CardTitle className="mt-2.5 text-3xl sm:text-4xl font-black tracking-tight tabular-nums text-foreground">
                                {format(kpiData.revenue)}
                            </CardTitle>
                        </div>
                        <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/25 shadow-xs">
                            <DollarSign className="size-6 stroke-[2.5]" />
                        </div>
                    </CardHeader>
                </Card>

                {/* 2. TOTAL ITEM */}
                <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
                    <CardHeader className="p-0 space-y-0 flex flex-row items-start justify-between">
                        <div>
                            <CardDescription className="text-xs sm:text-sm font-black uppercase tracking-wider text-muted-foreground">
                                TOTAL ITEM
                            </CardDescription>
                            <CardTitle className="mt-2.5 text-3xl sm:text-4xl font-black tracking-tight tabular-nums text-foreground">
                                {kpiData.totalItem.toLocaleString("en-US")}
                            </CardTitle>
                        </div>
                        <div className="size-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/25 shadow-xs">
                            <ShoppingBag className="size-6 stroke-[2.5]" />
                        </div>
                    </CardHeader>
                </Card>

                {/* 3. TOTAL CATEGORY */}
                <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
                    <CardHeader className="p-0 space-y-0 flex flex-row items-start justify-between">
                        <div>
                            <CardDescription className="text-xs sm:text-sm font-black uppercase tracking-wider text-muted-foreground">
                                TOTAL CATEGORY
                            </CardDescription>
                            <CardTitle className="mt-2.5 text-3xl sm:text-4xl font-black tracking-tight tabular-nums text-foreground">
                                {kpiData.totalCategory.toLocaleString("en-US")}
                            </CardTitle>
                        </div>
                        <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/25 shadow-xs">
                            <FolderTree className="size-6 stroke-[2.5]" />
                        </div>
                    </CardHeader>
                </Card>
            </div>

            {/* Main Grid Layout for Charts (Top: 6/6 split, Bottom: 4/8 split) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* 1. TOP-LEFT: `channels` (Percentage of Channel — Donut Chart) */}
                <Card data-tour="dashboard-channel-cards" className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all hover:shadow-md lg:col-span-4">
                    <CardHeader className="p-0 flex items-center justify-between border-b border-border/60 pb-4 mb-2">
                        <div>
                            <CardTitle className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2.5">
                                <PieIcon className="size-6 text-[var(--primary)]" />
                                Percentage of Channel
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm font-semibold text-muted-foreground mt-0.5">Distribution of revenue share by channel</CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {/* Donut Chart Container */}
                        <div className="relative flex items-center justify-center h-64 sm:h-72 w-full my-2">
                            {channelPercentageData.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">
                                    No channel revenue yet.
                                </div>
                            ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={channelPercentageData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={82}
                                        paddingAngle={0}
                                        dataKey="value"
                                        stroke="none"
                                        label={({ value }) => `${value}%`}
                                        labelLine={{ stroke: "#64748b", strokeWidth: 1.5, opacity: 0.7 }}
                                    >
                                        {channelPercentageData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "var(--popover, #ffffff)",
                                            borderColor: "var(--border, #e2e8f0)",
                                            borderRadius: "12px",
                                            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                                            fontSize: "13px",
                                            fontWeight: "600",
                                            padding: "10px 14px",
                                        }}
                                        formatter={(value: any, name: any, entry: any) => {
                                            const rev = entry?.payload?.revenue;
                                            const priceStr = rev !== undefined ? format(rev) : "";
                                            return [
                                                priceStr || `${value}%`,
                                                name,
                                            ];
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            )}
                        </div>

                        {/* Bottom Legend Dots for POS, MESSENGER, TELEGRAM, WEB */}
                        <div className="flex flex-wrap items-center justify-center gap-x-5.5 gap-y-2 pt-2.5 border-t border-border/40 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                            {channelPercentageData.map((c) => (
                                <span key={c.name} className="flex items-center gap-1.5">
                                    <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                                    {c.name}
                                </span>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* 2. TOP-RIGHT: `profit` (Cumulative Profit — USD by Date) */}
                <Card data-tour="dashboard-cumulative-profit" className="flex flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all hover:shadow-md lg:col-span-8">
                    <CardHeader className="p-0 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-4 mb-4">
                        <div>
                            <CardTitle className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2.5">
                                <TrendingUp className="size-6 text-[var(--primary)]" />
                                Cumulative Profit
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm font-semibold text-muted-foreground mt-0.5">USD by Date</CardDescription>
                        </div>

                        {/* Time Range Granularity Selector */}
                        <div className="flex items-center gap-1 bg-[var(--primary)]/10 p-1 rounded-xl border border-[var(--primary)]/20 text-xs font-bold">
                            {(["DAY", "WEEK", "MONTH", "YEAR"] as const).map((g) => {
                                const labels: Record<typeof g, string> = {
                                    DAY: "Daily",
                                    WEEK: "Weekly",
                                    MONTH: "Monthly",
                                    YEAR: "Yearly",
                                };
                                const isActive = granularity === g;
                                return (
                                    <button
                                        type="button"
                                        key={g}
                                        onClick={() => setGranularity(g)}
                                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer text-xs font-semibold ${isActive
                                                ? "bg-[var(--primary)] text-white shadow-xs"
                                                : "text-[var(--primary)] hover:bg-[var(--primary)]/15"
                                            }`}
                                    >
                                        {labels[g]}
                                    </button>
                                );
                            })}
                        </div>
                    </CardHeader>

                    <CardContent className="p-0 h-72 sm:h-82 w-full pt-2">
                        {periodProfitQuery.isError ? (
                            <div className="flex h-full items-center justify-center text-sm font-medium text-danger">
                                Couldn&apos;t load profit data — try refreshing.
                            </div>
                        ) : cumulativeProfitData.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">
                                No profit data for this period yet.
                            </div>
                        ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                accessibilityLayer
                                data={cumulativeProfitData}
                                margin={{ top: 15, right: 10, bottom: 0, left: 0 }}
                            >
                                <defs>
                                    <linearGradient id="chart16-fill" x1="0" y1="0" x2="0" y2="1">
                                        <stop
                                            offset="5%"
                                            stopColor="var(--primary)"
                                            stopOpacity={0.35}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor="var(--primary)"
                                            stopOpacity={0}
                                        />
                                    </linearGradient>
                                    <filter
                                        id="chart16-dot-glow"
                                        x="-50%"
                                        y="-50%"
                                        width="200%"
                                        height="200%"
                                    >
                                        <feGaussianBlur stdDeviation="3" result="blur" />
                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                    </filter>
                                    <filter
                                        id="chart16-line-glow"
                                        x="-10%"
                                        y="-20%"
                                        width="120%"
                                        height="140%"
                                    >
                                        <feGaussianBlur stdDeviation="8" result="blur" />
                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                    </filter>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.25} />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                    tickFormatter={(val) => {
                                        if (typeof val === "string") {
                                            return val.replace(/^Week of /i, "").replace(/ \d{4}$/, "");
                                        }
                                        return val;
                                    }}
                                    tick={{ fontSize: 12, fontWeight: 650, fill: "currentColor" }}
                                    className="text-muted-foreground font-semibold"
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fontWeight: 650, fill: "currentColor" }}
                                    className="text-muted-foreground font-semibold"
                                    domain={["auto", "auto"]}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "var(--popover, #ffffff)",
                                        borderColor: "var(--border, #e2e8f0)",
                                        borderRadius: "12px",
                                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                    }}
                                    formatter={(value: any) => [format(Number(value || 0)), "Cumulative Profit"]}
                                />
                                <Area
                                    dataKey="cumulative"
                                    type="natural"
                                    fill="url(#chart16-fill)"
                                    stroke="var(--primary)"
                                    strokeWidth={2.5}
                                    filter="url(#chart16-line-glow)"
                                    dot={{
                                        r: 4.5,
                                        fill: "var(--primary)",
                                        strokeWidth: 2,
                                        stroke: "var(--background, #ffffff)",
                                        filter: "url(#chart16-dot-glow)",
                                    }}
                                    activeDot={{ r: 6.5, strokeWidth: 2.5, stroke: "var(--background, #ffffff)" }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* 3. BOTTOM-LEFT: `trending_items` (Total Amount of Item Type — Vertical Bar Chart) */}
                <Card data-tour="dashboard-item-vector" className="flex flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all hover:shadow-md lg:col-span-7">
                    <CardHeader className="p-0 flex items-center justify-between border-b border-border/60 pb-4 mb-4">
                        <div>
                            <CardTitle className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2.5">
                                <BarChart2 className="size-6 text-[var(--primary)]" />
                                Total Amount of Item Type
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm font-semibold text-muted-foreground mt-0.5">Metrics breakdown per item type</CardDescription>
                        </div>
                        <Badge variant="success-light" radius="full" className="px-3.5 py-1 text-xs font-semibold text-[var(--primary)] border border-[var(--primary)]/20">
                            Item Comparison
                        </Badge>
                    </CardHeader>

                    <CardContent className="p-0 h-72 sm:h-82 w-full pt-2">
                        {itemProfitQuery.isError ? (
                            <div className="flex h-full items-center justify-center text-sm font-medium text-danger">
                                Couldn&apos;t load item sales — try refreshing.
                            </div>
                        ) : itemVectorData.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">
                                No sales recorded yet for this business.
                            </div>
                        ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                accessibilityLayer
                                data={itemVectorData}
                                margin={{ top: 12, right: 20, left: 0, bottom: 22 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                    tick={{ fontSize: 12, fontWeight: 650, fill: "currentColor" }}
                                    className="text-muted-foreground font-semibold"
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fontWeight: 650, fill: "currentColor" }}
                                    className="text-muted-foreground font-semibold"
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "var(--popover, #ffffff)",
                                        borderColor: "var(--border, #e2e8f0)",
                                        borderRadius: "12px",
                                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                    }}
                                    formatter={(value: any, name: any) => [
                                        name === "Total Revenue" ? format(Number(value || 0)) : `${Number(value || 0).toLocaleString("en-US")} pcs`,
                                        name,
                                    ]}
                                />
                                <Legend wrapperStyle={{ fontSize: "12px", fontWeight: "650" }} />
                                <Bar dataKey="totalAmount" name="Total Revenue" fill="var(--primary)" radius={5} />
                                <Bar dataKey="itemCount" name="Item Count" fill="#feb90d" radius={5} />
                            </BarChart>
                        </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* 4. BOTTOM-RIGHT: `stock_inventory` (Stock Inventory — Horizontal Bar Chart) */}
                <Card data-tour="dashboard-stock-on-hand" className="flex flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all hover:shadow-md lg:col-span-5">
                    <CardHeader className="p-0 flex items-center justify-between border-b border-border/60 pb-4 mb-4">
                        <div>
                            <CardTitle className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2.5">
                                <Layers className="size-6 text-[var(--primary)]" />
                                Stock Inventory
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm font-semibold text-muted-foreground mt-0.5">Horizontal stock level & volume distribution</CardDescription>
                        </div>
                        <Badge variant="success-light" radius="full" className="px-3.5 py-1 text-xs font-semibold text-[var(--primary)] border border-[var(--primary)]/20">
                            Inventory Metrics
                        </Badge>
                    </CardHeader>

                    <CardContent className="p-0 h-72 sm:h-82 w-full pt-2">
                        {stockInventoryData.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">
                                No stock on hand yet.
                            </div>
                        ) : (
                            <div className="flex flex-col justify-between h-full pt-1 pb-1">
                                <div className="space-y-2">
                                    {stockInventoryData.map((item) => {
                                        const revPct = Math.min(100, Math.max(3, (item.totalAmount / maxStockRevenue) * 100));
                                        const countPct = Math.min(100, Math.max(3, (item.itemCount / maxStockCount) * 100));
                                        return (
                                            <div key={item.name} className="relative group flex flex-col gap-1.5 p-1.5 px-2.5 rounded-xl transition-all duration-200 hover:bg-muted/40 cursor-pointer">
                                                {/* Hover Tooltip (Picture 2 format) */}
                                                <div className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-2 hidden -translate-x-1/2 group-hover:flex flex-col gap-2 rounded-xl border border-border/80 bg-popover p-3 shadow-xl backdrop-blur-xs min-w-48 text-xs">
                                                    <div className="font-bold text-foreground pb-1.5 border-b border-border/40 text-sm">{item.name}</div>
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-2 text-muted-foreground font-semibold">
                                                            <span className="size-2.5 rounded-xs bg-[var(--primary)] shrink-0" />
                                                            Total Revenue
                                                        </div>
                                                        <span className="font-bold text-foreground">{format(item.totalAmount)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-2 text-muted-foreground font-semibold">
                                                            <span className="size-2.5 rounded-xs bg-[#feb90d] shrink-0" />
                                                            Item Count
                                                        </div>
                                                        <span className="font-bold text-foreground">{item.itemCount.toLocaleString()} pcs</span>
                                                    </div>
                                                </div>

                                                {/* Text Directly Above Bar (Product Name Only) */}
                                                <div className="flex items-center text-xs sm:text-sm font-bold text-foreground">
                                                    <span className="truncate">{item.name}</span>
                                                </div>

                                                {/* Horizontal Bars */}
                                                <div className="space-y-1">
                                                    <div className="h-2 w-full">
                                                        <div
                                                            className="h-full rounded-full bg-[var(--primary)] transition-all duration-500 group-hover:brightness-110 shadow-2xs"
                                                            style={{ width: `${revPct}%` }}
                                                        />
                                                    </div>
                                                    <div className="h-2 w-full">
                                                        <div
                                                            className="h-full rounded-full bg-[#feb90d] transition-all duration-500 group-hover:brightness-110 shadow-2xs"
                                                            style={{ width: `${countPct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Polished Bottom Legend Pill Badges */}
                                <div className="flex items-center justify-center gap-3 pt-3 pb-1 mt-2 text-xs font-bold">
                                    <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/40 border border-border/60 text-foreground font-semibold shadow-2xs">
                                        <span className="size-2.5 rounded-full bg-[var(--primary)] shrink-0" />
                                        Total Revenue
                                    </span>
                                    <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/40 border border-border/60 text-foreground font-semibold shadow-2xs">
                                        <span className="size-2.5 rounded-full bg-[#feb90d] shrink-0" />
                                        Item Count
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>

            {/* Recent Orders & Best Selling Products Tables Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
                {/* LEFT TABLE: Recent Orders */}
                <Card className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm transition-all hover:shadow-md flex flex-col justify-between lg:col-span-7">
                    <div>
                        <CardHeader className="p-0 flex flex-row items-center justify-between border-b border-border/60 pb-3 mb-3">
                            <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                                Recent Orders
                            </CardTitle>
                            <Button variant="outline" size="sm" onClick={handleExportRecentOrders} className="h-8 gap-1.5 rounded-lg border-border/80 text-xs font-semibold cursor-pointer">
                                <Download className="size-3.5" />
                                Export
                            </Button>
                        </CardHeader>

                        <CardContent className="p-0 flex flex-col gap-3">
                            {/* Search Filter */}
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                    placeholder="Filter orders..."
                                    value={recentOrderFilter}
                                    onChange={(e) => {
                                        setRecentOrderFilter(e.target.value);
                                        setRecentOrderPage(1);
                                    }}
                                    className="pl-9 h-9 text-xs sm:text-sm rounded-lg bg-muted/30 border-border/60 font-medium"
                                />
                            </div>

                            {/* Orders Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead>
                                        <tr className="border-b border-border/40 text-muted-foreground font-bold text-[11px] uppercase tracking-wider">
                                            <th className="py-2 px-2.5">ID</th>
                                            <th className="py-2 px-2.5">Customer</th>
                                            <th className="py-2 px-2.5">Product</th>
                                            <th className="py-2 px-2.5 cursor-pointer hover:text-foreground">
                                                <span className="flex items-center gap-1">
                                                    Amount <ArrowUpDown className="size-3" />
                                                </span>
                                            </th>
                                            <th className="py-2 px-2.5">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {paginatedRecentOrders.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-muted-foreground font-medium">
                                                    No orders yet.
                                                </td>
                                            </tr>
                                        )}
                                        {paginatedRecentOrders.map((order) => {
                                            const getStatusBadgeStyle = (status: string) => {
                                                const s = status.toLowerCase();
                                                if (s === "success" || s === "paid") {
                                                    return "bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30";
                                                }
                                                if (s === "processing" || s === "pending") {
                                                    return "bg-[#feb90d]/15 text-[#9a6900] dark:text-[#feb90d] border border-[#feb90d]/35";
                                                }
                                                if (s === "failed" || s === "fail") {
                                                    return "bg-[#d14341]/15 text-[#d14341] dark:text-red-400 border border-[#d14341]/30";
                                                }
                                                return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700";
                                            };

                                            return (
                                                <tr key={order.id} className="h-12 hover:bg-muted/30 transition-colors">
                                                    <td className="py-2 px-2.5 font-mono font-bold text-[var(--primary)] text-xs whitespace-nowrap">{order.id}</td>
                                                    <td className="py-2 px-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="size-7 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 text-foreground flex items-center justify-center text-[10px] font-black shrink-0 border border-border/50 shadow-2xs">
                                                                {order.avatarUrl ? (
                                                                    <img
                                                                        src={order.avatarUrl}
                                                                        alt={order.customer}
                                                                        className="size-full object-cover"
                                                                        onError={(e) => {
                                                                            (e.target as HTMLElement).style.display = "none";
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    order.avatar
                                                                )}
                                                            </div>
                                                            <span className="font-bold text-foreground text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[130px] inline-block">{order.customer}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-2.5 text-muted-foreground font-medium text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[130px]">{order.product}</td>
                                                    <td className="py-2 px-2.5 font-bold text-foreground text-xs sm:text-sm whitespace-nowrap">{format(order.amount)}</td>
                                                    <td className="py-2 px-2.5 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-2xs transition-all ${getStatusBadgeStyle(order.status)}`}>
                                                            {order.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </div>

                    {/* Pagination Footer */}
                    <div className="flex items-center justify-between border-t border-border/40 pt-3 mt-3 text-xs text-muted-foreground font-medium">
                        <span>
                            Showing {recentOrders.length > 0 ? (recentOrderPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
                            {Math.min(recentOrderPage * ITEMS_PER_PAGE, recentOrders.length)} of {recentOrders.length}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setRecentOrderPage((p) => Math.max(1, p - 1))}
                                disabled={recentOrderPage === 1}
                                className="h-7 w-7 p-0 rounded-lg border-border/60 cursor-pointer"
                            >
                                <ChevronLeft className="size-3.5" />
                            </Button>
                            <span className="px-1.5 text-xs font-bold text-foreground">
                                {recentOrderPage} / {Math.max(1, Math.ceil(recentOrders.length / ITEMS_PER_PAGE))}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setRecentOrderPage((p) => Math.min(Math.ceil(recentOrders.length / ITEMS_PER_PAGE), p + 1))}
                                disabled={recentOrderPage >= Math.ceil(recentOrders.length / ITEMS_PER_PAGE)}
                                className="h-7 w-7 p-0 rounded-lg border-border/60 cursor-pointer"
                            >
                                <ChevronRight className="size-3.5" />
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* RIGHT TABLE: Best Selling Products */}
                <Card className="h-full rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm transition-all hover:shadow-md flex flex-col justify-between lg:col-span-5">
                    <div>
                        <CardHeader className="p-0 flex flex-row items-center justify-between border-b border-border/60 pb-3 mb-3">
                            <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                                Best Selling Products
                            </CardTitle>
                            <Button variant="outline" size="sm" onClick={handleExportBestSelling} className="h-8 gap-1.5 rounded-lg border-border/80 text-xs font-semibold cursor-pointer">
                                <Download className="size-3.5" />
                                Export
                            </Button>
                        </CardHeader>

                        <CardContent className="p-0 flex flex-col gap-3">
                            {/* Search Filter */}
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                    placeholder="Filter products..."
                                    value={bestSellingFilter}
                                    onChange={(e) => {
                                        setBestSellingFilter(e.target.value);
                                        setBestSellingPage(1);
                                    }}
                                    className="pl-9 h-9 text-xs sm:text-sm rounded-lg bg-muted/30 border-border/60 font-medium"
                                />
                            </div>

                            {/* Best Selling Products Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead>
                                        <tr className="border-b border-border/40 text-muted-foreground font-bold text-[11px] uppercase tracking-wider">
                                            <th className="py-2 px-2.5">Product</th>
                                            <th className="py-2 px-2.5 cursor-pointer hover:text-foreground">
                                                <span className="flex items-center gap-1">
                                                    Sales <ArrowUpDown className="size-3" />
                                                </span>
                                            </th>
                                            <th className="py-2 px-2.5 cursor-pointer hover:text-foreground">
                                                <span className="flex items-center gap-1">
                                                    Sold <ArrowUpDown className="size-3" />
                                                </span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {paginatedBestSellingProducts.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="py-8 text-center text-muted-foreground font-medium">
                                                    No products yet.
                                                </td>
                                            </tr>
                                        )}
                                        {paginatedBestSellingProducts.map((prod, i) => (
                                            <tr key={`${prod.name}-${i}`} className="h-12 hover:bg-muted/30 transition-colors">
                                                <td className="py-2 px-2.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="size-7 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold shrink-0 border border-border/50 shadow-2xs">
                                                            {prod.image ? (
                                                                <img
                                                                    src={prod.image}
                                                                    alt={prod.name}
                                                                    className="size-full object-cover"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLElement).style.display = "none";
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="size-full flex items-center justify-center text-[10px] bg-slate-200 dark:bg-slate-700 font-bold text-foreground">
                                                                    {prod.name.slice(0, 2).toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="font-bold text-foreground text-xs sm:text-sm truncate max-w-[140px] sm:max-w-[180px] inline-block">{prod.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-2 px-2.5 font-bold text-foreground text-xs sm:text-sm whitespace-nowrap">{format(prod.sales)}</td>
                                                <td className="py-2 px-2.5 text-muted-foreground font-semibold text-xs sm:text-sm whitespace-nowrap">{prod.sold}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </div>

                    {/* Pagination Footer */}
                    <div className="flex items-center justify-between border-t border-border/40 pt-3 mt-3 text-xs text-muted-foreground font-medium">
                        <span>
                            Showing {bestSellingProducts.length > 0 ? (bestSellingPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
                            {Math.min(bestSellingPage * ITEMS_PER_PAGE, bestSellingProducts.length)} of {bestSellingProducts.length}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setBestSellingPage((p) => Math.max(1, p - 1))}
                                disabled={bestSellingPage === 1}
                                className="h-7 w-7 p-0 rounded-lg border-border/60 cursor-pointer"
                            >
                                <ChevronLeft className="size-3.5" />
                            </Button>
                            <span className="px-1.5 text-xs font-bold text-foreground">
                                {bestSellingPage} / {Math.max(1, Math.ceil(bestSellingProducts.length / ITEMS_PER_PAGE))}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setBestSellingPage((p) => Math.min(Math.ceil(bestSellingProducts.length / ITEMS_PER_PAGE), p + 1))}
                                disabled={bestSellingPage >= Math.ceil(bestSellingProducts.length / ITEMS_PER_PAGE)}
                                className="h-7 w-7 p-0 rounded-lg border-border/60 cursor-pointer"
                            >
                                <ChevronRight className="size-3.5" />
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
