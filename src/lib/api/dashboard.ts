import type { ReportGranularity } from "@/lib/api/sales-report";

export type DashboardKpis = {
    revenue: number;
    totalItems: number;
    totalCategories: number;
    inventoryOnHand: number;
};

export type ChannelShare = {
    channel: string;
    percentage: number;
    revenue: number;
};

export type ProfitPoint = {
    periodStart: string;
    label: string;
    profit: number;
    cumulative: number;
};

export type ProfitTrend = {
    granularity: ReportGranularity;
    points: ProfitPoint[];
};

export type TopItem = {
    itemId: string;
    name: string;
    itemCount: number;
    totalAmount: number;
};

export type StockLevel = {
    itemId: string;
    name: string;
    quantityOnHand: number;
    totalAmount: number;
    revenuePercent: number;
    countPercent: number;
};

export type DashboardOverview = {
    kpis: DashboardKpis;
    channels: ChannelShare[];
    profitTrend: ProfitTrend;
    topItems: TopItem[];
    stockLevels: StockLevel[];
};

export type RecentOrderRow = {
    orderId: string;
    reference: string;
    customerName: string;
    customerInitials: string;
    customerAvatarUrl: string | null;
    product: string;
    category: string;
    amount: number;
    status: string;
};

export type BestSellingRow = {
    itemId: string;
    name: string;
    category: string;
    sales: number;
    sold: number;
    imageUrl: string | null;
};

export type DashboardPage<T> = {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    empty: boolean;
};
