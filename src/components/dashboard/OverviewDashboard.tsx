"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import {
    FileSpreadsheet,
    FileText,
    FileType,
    Loader2,
    DollarSign,
    ShoppingBag,
    Layers,
    FolderTree,
    Download,
    Search,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { useMoney } from "@/hooks/useMoney";
import {
    useGetBestSellingQuery,
    useGetDashboardOverviewQuery,
    useGetRecentOrdersQuery,
    useLazyGetBestSellingQuery,
    useLazyGetRecentOrdersQuery,
} from "@/services/dashboardApi";
import type { ReportGranularity } from "@/lib/api/sales-report";
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
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { ChartCardSkeleton } from "@/components/dashboard/charts/ChartCardSkeleton";

/*
 * The three charting cards are fetched only once the dashboard is on screen.
 *
 * Recharts is by far the heaviest thing this page pulls in, and none of it is
 * needed to paint the figures above the charts or the tables below them. Held
 * back like this, the numbers land first and the charts fill in behind them —
 * rather than everything waiting on the chart library to parse.
 *
 * `ssr: false` because these render nothing meaningful on the server anyway:
 * they size themselves against a real viewport.
 */
const ChannelDonutCard = dynamic(
    () => import("@/components/dashboard/charts/ChannelDonutCard").then((mod) => mod.ChannelDonutCard),
    { ssr: false, loading: () => <ChartCardSkeleton className="lg:col-span-4" /> },
);

const CumulativeProfitCard = dynamic(
    () => import("@/components/dashboard/charts/CumulativeProfitCard").then((mod) => mod.CumulativeProfitCard),
    { ssr: false, loading: () => <ChartCardSkeleton className="lg:col-span-8" /> },
);

const ItemTypeBarCard = dynamic(
    () => import("@/components/dashboard/charts/ItemTypeBarCard").then((mod) => mod.ItemTypeBarCard),
    { ssr: false, loading: () => <ChartCardSkeleton className="lg:col-span-7" /> },
);

// Color Palette for Channels matching system theme tokens
const CHANNEL_COLORS: Record<string, string> = {
    POS: "#00932a",       // Green (swapped with Telegram)
    WEB: "#eda100",       // Yellow (swapped with Messenger)
    TELEGRAM: "#d14341",  // Red (swapped with POS)
    MESSENGER: "#2a78d6", // Blue (swapped with Web)
};
/** The four cards an export photographs, in the order a report shows them. */
const CHART_SELECTORS = [
    "[data-tour='dashboard-channel-cards']",
    "[data-tour='dashboard-cumulative-profit']",
    "[data-tour='dashboard-item-vector']",
    "[data-tour='dashboard-stock-on-hand']",
];

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

/**
 * Gives the chart cards a moment to actually be charts before they are
 * photographed.
 *
 * They are loaded on demand — recharts is the heaviest thing this page pulls
 * in and it is not needed to read the figures — so a card can still be a
 * skeleton when an export starts. Capturing then would put a grey placeholder
 * in the report where a chart belongs. This waits for the drawn SVG to appear
 * and gives up after a moment rather than blocking the export forever: a
 * missing chart is a report without a picture, which beats no report at all.
 */
async function waitForCharts(selectors: string[], timeoutMs = 4000): Promise<void> {
    const deadline = Date.now() + timeoutMs;

    const painted = () =>
        selectors.every((selector) => document.querySelector(selector + " svg") !== null);

    while (!painted() && Date.now() < deadline) {
        await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 50)));
    }
}

export function OverviewDashboard() {
    const { format } = useMoney();
    const [granularity, setGranularity] = useState<ReportGranularity>("DAY");

    const [recentOrderFilter, setRecentOrderFilter] = useState("");
    const [bestSellingFilter, setBestSellingFilter] = useState("");
    const [recentOrderPage, setRecentOrderPage] = useState(1);
    const [bestSellingPage, setBestSellingPage] = useState(1);

    const ITEMS_PER_PAGE = 5;
    /** One page big enough to hold a CSV export of everything matching. */
    const EXPORT_PAGE_SIZE = 1000;

    /*
     * Three reads, and nothing derived from them here.
     *
     * This screen used to fetch four reports plus the entire catalogue — up
     * to ten thousand items — and then total, rank, accumulate and join them
     * in the browser on every render. Most of that arithmetic needed the whole
     * set to be right: a running total, a share of revenue, a ranking, a bar
     * scaled to the largest row. The server has the whole set; a page does not.
     */
    const overviewQuery = useGetDashboardOverviewQuery({ granularity });
    const overview = overviewQuery.data;

    // Searching and paging are the server's too, so a search reaches rows
    // this page does not hold.
    const recentOrdersQuery = useGetRecentOrdersQuery({
        search: recentOrderFilter.trim() || undefined,
        page: recentOrderPage - 1,
        size: ITEMS_PER_PAGE,
    });

    const bestSellingQuery = useGetBestSellingQuery({
        search: bestSellingFilter.trim() || undefined,
        page: bestSellingPage - 1,
        size: ITEMS_PER_PAGE,
    });

    const kpiData = {
        revenue: overview?.kpis.revenue ?? 0,
        totalItem: overview?.kpis.totalItems ?? 0,
        totalCategory: overview?.kpis.totalCategories ?? 0,
        inventory: overview?.kpis.inventoryOnHand ?? 0,
    };

    // The only thing still worked out here is which colour a channel is drawn
    // in, which belongs to the theme rather than to the data.
    const channelPercentageData = useMemo(
        () =>
            (overview?.channels ?? []).map((channel) => ({
                name: channel.channel,
                value: channel.percentage,
                revenue: channel.revenue,
                color: CHANNEL_COLORS[channel.channel] || "#64748b",
            })),
        [overview?.channels],
    );

    const cumulativeProfitData = overview?.profitTrend.points ?? [];
    const itemVectorData = overview?.topItems ?? [];
    const stockInventoryData = overview?.stockLevels ?? [];

    const monthYearLabel = useMemo(
        () => new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        [],
    );

    const paginatedRecentOrders = recentOrdersQuery.data?.content ?? [];
    const recentOrderTotalPages = recentOrdersQuery.data?.totalPages ?? 0;
    const recentOrderTotal = recentOrdersQuery.data?.totalElements ?? 0;

    const [fetchAllRecentOrders] = useLazyGetRecentOrdersQuery();
    const [fetchAllBestSelling] = useLazyGetBestSellingQuery();

    const paginatedBestSellingProducts = bestSellingQuery.data?.content ?? [];
    const bestSellingTotalPages = bestSellingQuery.data?.totalPages ?? 0;
    const bestSellingTotal = bestSellingQuery.data?.totalElements ?? 0;


    /*
     * Export takes every row the current search matches, not the five on
     * screen. The table itself reads a page at a time, so the rest is fetched
     * here, on the click — the one moment anybody wants it.
     */
    const handleExportRecentOrders = async () => {
        const all = await fetchAllRecentOrders({
            search: recentOrderFilter.trim() || undefined,
            page: 0,
            size: EXPORT_PAGE_SIZE,
        }).unwrap();

        const headers = ["Order ID", "Customer", "Product", "Category", "Amount ($)", "Status"];
        const rows = all.content.map((o) => [
            o.reference,
            o.customerName,
            o.product,
            o.category,
            o.amount,
            o.status,
        ]);

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

    const handleExportBestSelling = async () => {
        const all = await fetchAllBestSelling({
            search: bestSellingFilter.trim() || undefined,
            page: 0,
            size: EXPORT_PAGE_SIZE,
        }).unwrap();

        const headers = ["Product", "Category", "Total Sales ($)", "Units Sold"];
        const rows = all.content.map((p) => [p.name, p.category, p.sales, p.sold]);

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
        // The PDF photographs the whole page, charts included.
        await waitForCharts(CHART_SELECTORS);

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
            // The tables read a page at a time, so a report fetches the whole
            // set the same way the CSV buttons do — on the click, once.
            const [allOrders, allProducts] = await Promise.all([
                fetchAllRecentOrders({
                    search: recentOrderFilter.trim() || undefined,
                    page: 0,
                    size: EXPORT_PAGE_SIZE,
                }).unwrap(),
                fetchAllBestSelling({
                    search: bestSellingFilter.trim() || undefined,
                    page: 0,
                    size: EXPORT_PAGE_SIZE,
                }).unwrap(),
            ]);
            const recentOrders = allOrders.content;
            const bestSellingProducts = allProducts.content;

            setIsExportingDocs(true);
            await new Promise((r) => setTimeout(r, 100));

            // Charts are fetched on demand, so a card can still be a skeleton
            // when an export starts. Give them a moment to become charts
            // before photographing them.
            await waitForCharts(CHART_SELECTORS);

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
                      cumulativeProfitData.map((p) => [p.label, `$${p.profit.toFixed(2)}`, `$${p.cumulative.toFixed(2)}`]),
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
                      stockInventoryData.map((st) => [st.name, st.quantityOnHand, `$${st.totalAmount.toFixed(2)}`]),
                  )}
                `)}

                ${section("Recent Orders", dataTable(
                    ["Order ID", "Customer", "Product", "Category", "Amount ($)", "Status"],
                    recentOrders.map((o) => [o.reference, o.customerName, o.product, o.category, `$${o.amount.toFixed(2)}`, o.status]),
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
            // The tables read a page at a time, so a report fetches the whole
            // set the same way the CSV buttons do — on the click, once.
            const [allOrders, allProducts] = await Promise.all([
                fetchAllRecentOrders({
                    search: recentOrderFilter.trim() || undefined,
                    page: 0,
                    size: EXPORT_PAGE_SIZE,
                }).unwrap(),
                fetchAllBestSelling({
                    search: bestSellingFilter.trim() || undefined,
                    page: 0,
                    size: EXPORT_PAGE_SIZE,
                }).unwrap(),
            ]);
            const recentOrders = allOrders.content;
            const bestSellingProducts = allProducts.content;

            setIsExportingExcel(true);
            await new Promise((r) => setTimeout(r, 100));

            // Charts are fetched on demand, so a card can still be a skeleton
            // when an export starts. Give them a moment to become charts
            // before photographing them.
            await waitForCharts(CHART_SELECTORS);

            const pieChartImg = await captureChartImage("[data-tour='dashboard-channel-cards']");
            const profitChartImg = await captureChartImage("[data-tour='dashboard-cumulative-profit']");
            const barChartImg = await captureChartImage("[data-tour='dashboard-item-vector']");
            const stockChartImg = await captureChartImage("[data-tour='dashboard-stock-on-hand']");

            const totalChannelRev = channelPercentageData.reduce((acc, c) => acc + c.revenue, 0) || 1;
            const totalOrdersCount = recentOrderTotal;
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
                            <td class="data-cell">${o.reference}</td>
                            <td class="data-cell">${o.customerName}</td>
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
    const isDashboardLoading = overviewQuery.isLoading;

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
                <ChannelDonutCard data={channelPercentageData} />

                {/* 2. TOP-RIGHT: `profit` (Cumulative Profit — USD by Date) */}
                <CumulativeProfitCard
                    data={cumulativeProfitData}
                    granularity={granularity}
                    onGranularityChange={setGranularity}
                    isError={overviewQuery.isError}
                />

                {/* 3. BOTTOM-LEFT: `trending_items` (Total Amount of Item Type — Vertical Bar Chart) */}
                <ItemTypeBarCard data={itemVectorData} isError={overviewQuery.isError} />

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
                                        // Floored at 3% so a real but tiny row is still a visible bar.
                                        const revPct = Math.min(100, Math.max(3, item.revenuePercent));
                                        const countPct = Math.min(100, Math.max(3, item.countPercent));
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
                                                        <span className="font-bold text-foreground">{item.quantityOnHand.toLocaleString()} pcs</span>
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
                                <Download className="size-3.5 text-primary" />
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
                                                <tr key={order.reference} className="h-12 hover:bg-muted/30 transition-colors">
                                                    <td className="py-2 px-2.5 font-mono font-bold text-[var(--primary)] text-xs whitespace-nowrap">{order.reference}</td>
                                                    <td className="py-2 px-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="size-7 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 text-foreground flex items-center justify-center text-[10px] font-black shrink-0 border border-border/50 shadow-2xs">
                                                                {order.customerAvatarUrl ? (
                                                                    <img
                                                                        src={order.customerAvatarUrl}
                                                                        alt={order.customerName}
                                                                        className="size-full object-cover"
                                                                        onError={(e) => {
                                                                            (e.target as HTMLImageElement).src = "/brand/fluxibiz-mark.png";
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    order.customerInitials
                                                                )}
                                                            </div>
                                                            <span className="font-bold text-foreground text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[130px] inline-block">{order.customerName}</span>
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
                            Showing {recentOrderTotal > 0 ? (recentOrderPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
                            {Math.min(recentOrderPage * ITEMS_PER_PAGE, recentOrderTotal)} of {recentOrderTotal}
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
                                {recentOrderPage} / {Math.max(1, recentOrderTotalPages)}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setRecentOrderPage((p) => Math.min(Math.max(1, recentOrderTotalPages), p + 1))}
                                disabled={recentOrderPage >= recentOrderTotalPages}
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
                                <Download className="size-3.5 text-primary" />
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
                                                            {prod.imageUrl ? (
                                                                <img
                                                                    src={prod.imageUrl}
                                                                    alt={prod.name}
                                                                    className="size-full object-cover"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).src = "/brand/fluxibiz-mark.png";
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
                            Showing {bestSellingTotal > 0 ? (bestSellingPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
                            {Math.min(bestSellingPage * ITEMS_PER_PAGE, bestSellingTotal)} of {bestSellingTotal}
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
                                {bestSellingPage} / {Math.max(1, bestSellingTotalPages)}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setBestSellingPage((p) => Math.min(Math.max(1, bestSellingTotalPages), p + 1))}
                                disabled={bestSellingPage >= bestSellingTotalPages}
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
