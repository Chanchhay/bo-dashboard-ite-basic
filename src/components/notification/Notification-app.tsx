"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Bell,
    CheckCheck,
    CircleAlert,
    CreditCard,
    Inbox,
    Loader2,
    Package,
    Search,
    ShoppingBag,
    Tag,
    Trash2,
    Check,
    ExternalLink,
    Filter,
    UserCheck,
} from "lucide-react";

import {
    useGetReceivedNotificationsQuery,
    useMarkAllAsReadMutation,
    useMarkAsReadMutation,
    useDeleteNotificationMutation,
} from "@/services/notificationApi";
import type { Notification } from "@/lib/api/notification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TourButton } from "@/components/onboarding/TourButton";

function formatTimeAgo(dateStr?: string | null): string {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

function getNotificationIcon(type?: string | null, title?: string | null) {
    const t = type?.toUpperCase();
    const titleLower = (title || "").toLowerCase();

    if (titleLower.includes("staff") || titleLower.includes("signed in") || titleLower.includes("login") || titleLower.includes("user")) {
        return (
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-100/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50 shadow-2xs">
                <UserCheck className="size-5.5" />
            </div>
        );
    }

    switch (t) {
        case "ORDER":
        case "SUCCESS":
            return (
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 shadow-2xs">
                    <ShoppingBag className="size-5.5" />
                </div>
            );
        case "PAYMENT":
            return (
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-100/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 shadow-2xs">
                    <CreditCard className="size-5.5" />
                </div>
            );
        case "INVENTORY":
        case "LOW_STOCK":
        case "WARNING":
        case "ALERT":
            return (
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-100/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 shadow-2xs">
                    <Package className="size-5.5" />
                </div>
            );
        case "PROMOTION":
            return (
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-purple-100/80 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50 shadow-2xs">
                    <Tag className="size-5.5" />
                </div>
            );
        case "SYSTEM":
        default:
            return (
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary border border-primary/25 shadow-2xs">
                    <Bell className="size-5.5" />
                </div>
            );
    }
}

function getNotificationLink(notification: Notification): string {
    // 1. Prioritize explicit deepLink if provided
    if (notification.deepLink && notification.deepLink.startsWith("/") && notification.deepLink !== "#") {
        return notification.deepLink;
    }

    const type = notification.type?.toUpperCase() || "";
    const text = `${notification.title || ""} ${notification.content || ""}`.toLowerCase();

    // 2. Specific feature fallbacks based on content / type
    if (text.includes("discount") || text.includes("coupon") || type === "PROMOTION") {
        return "/sales/discounts";
    }

    if (text.includes("employee") || text.includes("staff") || text.includes("signed in") || text.includes("login")) {
        return "/employees";
    }

    if (
        type === "INVENTORY" ||
        type === "LOW_STOCK" ||
        text.includes("low stock") ||
        text.includes("stock") ||
        text.includes("restock")
    ) {
        return "/inventory/stock";
    }

    if (text.includes("customer")) {
        return "/sales/customers";
    }

    if (text.includes("session") || text.includes("till") || text.includes("cash drawer")) {
        return "/sales/sessions";
    }

    if (text.includes("tax")) {
        return "/sales/taxes";
    }

    if (
        type === "ORDER" ||
        type === "PAYMENT" ||
        type === "SUCCESS" ||
        text.includes("inv-") ||
        text.includes("order") ||
        text.includes("receipt")
    ) {
        return "/sales/orders";
    }

    return "/sales/orders";
}

export default function NotificationsApp() {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<string>("ALL");

    const [isOnline, setIsOnline] = useState<boolean>(() =>
        typeof window !== "undefined" ? navigator.onLine : true
    );

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    const { data, isLoading, isError, refetch } = useGetReceivedNotificationsQuery({
        page: 0,
        size: 50,
        sort: "createdDate,desc",
    });

    const [markAsRead] = useMarkAsReadMutation();
    const [markAllAsRead, { isLoading: isMarkingAll }] = useMarkAllAsReadMutation();
    const [deleteNotification] = useDeleteNotificationMutation();
    const router = useRouter();

    const notifications = data?.content ?? [];

    const stats = useMemo(() => {
        const total = notifications.length;
        const unread = notifications.filter((n) => !n.read).length;
        const orders = notifications.filter((n) => {
            const t = (n.type || "").toUpperCase();
            const text = `${n.title || ""} ${n.content || ""}`.toLowerCase();
            return t === "ORDER" || text.includes("order") || text.includes("pending");
        }).length;
        const stockAlerts = notifications.filter((n) => {
            const t = (n.type || "").toUpperCase();
            const text = `${n.title || ""} ${n.content || ""}`.toLowerCase();
            return ["INVENTORY", "LOW_STOCK", "WARNING", "ALERT"].includes(t) || text.includes("stock");
        }).length;
        return { total, unread, orders, stockAlerts };
    }, [notifications]);

    const filteredNotifications = useMemo(() => {
        return notifications.filter((item) => {
            const t = (item.type || "").toUpperCase();
            const text = `${item.title || ""} ${item.content || ""}`.toLowerCase();

            let matchesTab = true;
            if (activeTab === "UNREAD") {
                matchesTab = !item.read;
            } else if (activeTab === "ORDER") {
                matchesTab = t === "ORDER" || text.includes("order") || text.includes("pending");
            } else if (activeTab === "INVENTORY") {
                matchesTab =
                    ["INVENTORY", "LOW_STOCK", "WARNING", "ALERT"].includes(t) ||
                    text.includes("stock") ||
                    text.includes("inventory") ||
                    text.includes("restock");
            } else if (activeTab === "PAYMENT") {
                matchesTab =
                    t === "PAYMENT" ||
                    text.includes("payment") ||
                    text.includes("paid") ||
                    text.includes("pay success") ||
                    text.includes("sale");
            } else if (activeTab === "PROMOTION") {
                matchesTab =
                    t === "PROMOTION" ||
                    text.includes("discount") ||
                    text.includes("coupon") ||
                    text.includes("promotion") ||
                    text.includes("promo");
            } else if (activeTab === "SYSTEM") {
                matchesTab =
                    t === "SYSTEM" ||
                    t === "GENERAL" ||
                    text.includes("staff") ||
                    text.includes("login") ||
                    text.includes("signed in") ||
                    text.includes("user");
            }

            const q = searchQuery.trim().toLowerCase();
            const matchesQuery =
                !q ||
                item.title?.toLowerCase().includes(q) ||
                item.content?.toLowerCase().includes(q) ||
                item.senderName?.toLowerCase().includes(q);

            return matchesTab && matchesQuery;
        });
    }, [notifications, activeTab, searchQuery]);

    return (
        <div className="flex flex-col gap-6 pb-8">
            {/* Sticky Top: Header & Stat Cards */}
            <div className="sticky top-0 z-20 -mx-5 px-5 lg:-mx-8 lg:px-8 pt-2 pb-2.5 bg-shell/95 backdrop-blur-md transition-all flex flex-col gap-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            View and manage real-time system alerts, order updates, and inventory notifications.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <TourButton />
                        {stats.unread > 0 && (
                            <Button
                                type="button"
                                onClick={() => markAllAsRead()}
                                disabled={isMarkingAll}
                                size="sm"
                                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl h-9 sm:h-10 px-3.5 sm:px-4 shadow-xs shrink-0 self-start sm:self-auto"
                            >
                                <CheckCheck className="size-4" />
                                <span>Mark all as read ({stats.unread})</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Stat Cards */}
                <div data-tour="notifications-stats" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs flex items-center gap-3">
                        <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                            <Bell className="size-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Total Notifications</p>
                            <p className="text-xl font-bold text-foreground">{stats.total}</p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs flex items-center gap-3">
                        <div className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <CheckCheck className="size-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Unread Alerts</p>
                            <p className="text-xl font-bold text-foreground">{stats.unread}</p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs flex items-center gap-3">
                        <div className="grid size-10 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <ShoppingBag className="size-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Order Updates</p>
                            <p className="text-xl font-bold text-foreground">{stats.orders}</p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs flex items-center gap-3">
                        <div className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Package className="size-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Stock Warnings</p>
                            <p className="text-xl font-bold text-foreground">{stats.stockAlerts}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden flex flex-col">
                {/* Control Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-border p-4 gap-3 bg-card shrink-0">
                    <div data-tour="notifications-search" className="relative w-full sm:w-80">
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search notifications..."
                            className="h-10 pl-9 text-sm rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground"
                        />
                    </div>

                    <div
                        data-tour="notifications-tabs"
                        role="group"
                        aria-label="Filter notifications"
                        className="flex max-w-full items-center gap-1 overflow-x-auto scrollbar-none rounded-xl bg-muted p-1 border border-transparent dark:border-border shrink-0"
                    >
                        {[
                            { id: "ALL", label: "All" },
                            { id: "UNREAD", label: "Unread" },
                            { id: "ORDER", label: "Orders" },
                            { id: "INVENTORY", label: "Inventory" },
                            { id: "PAYMENT", label: "Payments" },
                            { id: "PROMOTION", label: "Promotions" },
                            { id: "SYSTEM", label: "System" },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                aria-pressed={activeTab === tab.id}
                                className={`rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-[13px] whitespace-nowrap shrink-0 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${activeTab === tab.id
                                    ? "bg-card font-medium text-foreground shadow-[0_1px_2px_rgba(22,24,28,.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-transparent dark:border-[#2a3042]"
                                    : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List Container */}
                <div data-tour="notifications-list" className="overflow-y-auto max-h-[calc(100dvh-350px)] sm:max-h-[calc(100dvh-370px)] divide-y divide-border">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                            <Loader2 className="size-7 animate-spin text-primary" />
                            <p className="text-sm font-semibold">Loading notifications...</p>
                        </div>
                    )}

                    {(isError || !isOnline) && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-12 px-5 text-center gap-2.5">
                            <p className="text-sm text-danger font-bold max-w-[320px]">
                                {!isOnline
                                    ? "Please connect to the internet to view notifications."
                                    : "Failed to load notifications."}
                            </p>
                            <Button type="button" variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl">
                                Try again
                            </Button>
                        </div>
                    )}

                    {!isLoading && !isError && filteredNotifications.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 px-5 text-center gap-3">
                            <div className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
                                <Inbox className="size-7" />
                            </div>
                            <p className="text-base font-bold text-foreground">
                                {searchQuery ? "No matching notifications" : "No notifications found"}
                            </p>
                            <p className="text-xs text-muted-foreground max-w-[320px]">
                                {searchQuery
                                    ? "Try checking for typos or clear your search query."
                                    : "You're all caught up! Real-time alerts will appear here as they arrive."}
                            </p>
                        </div>
                    )}

                    {!isLoading && !isError && filteredNotifications.length > 0 && (
                        filteredNotifications.map((notification) => {
                            const isUnread = !notification.read;
                            const timeAgo = formatTimeAgo(notification.createdAt);
                            const targetLink = getNotificationLink(notification);

                            const handleCardClick = () => {
                                if (isUnread) {
                                    markAsRead(notification.id);
                                }
                                if (targetLink) {
                                    router.push(targetLink);
                                }
                            };

                            return (
                                <div
                                    key={notification.id}
                                    onClick={handleCardClick}
                                    className={`group flex items-start gap-4 p-4 transition-colors ${targetLink ? "cursor-pointer" : ""
                                        } ${isUnread
                                            ? "bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/15"
                                            : "bg-card hover:bg-muted/50"
                                        }`}
                                >
                                    {getNotificationIcon(notification.type, notification.title)}

                                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                                        <div className="flex items-start justify-between gap-2.5">
                                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                                <span
                                                    className={`text-sm sm:text-base leading-snug truncate ${isUnread
                                                        ? "font-bold text-gray-900 dark:text-[#f8fafc]"
                                                        : "font-bold text-gray-800 dark:text-slate-200"
                                                        }`}
                                                >
                                                    {notification.title || "Notification Alert"}
                                                </span>
                                                {notification.type && (
                                                    <span className="rounded-md bg-gray-200/80 dark:bg-[#252a38] px-2.5 py-0.5 text-[11px] font-bold text-gray-800 dark:text-[#94a3b8] uppercase tracking-wider shrink-0 border border-gray-300/80 dark:border-[#384252]">
                                                        {notification.type}
                                                    </span>
                                                )}
                                            </div>

                                            {timeAgo && (
                                                <span className="text-xs font-semibold text-gray-600 dark:text-slate-400 shrink-0 mt-0.5">
                                                    {timeAgo}
                                                </span>
                                            )}
                                        </div>

                                        {notification.senderName && (
                                            <span className="text-xs font-bold text-[#008024] dark:text-[#00b032] truncate">
                                                From: {notification.senderName}
                                            </span>
                                        )}

                                        {notification.content && (
                                            <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-300 leading-relaxed line-clamp-2 font-medium">
                                                {notification.content}
                                            </p>
                                        )}

                                        {targetLink && (
                                            <div className="mt-1">
                                                <span
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#008024] dark:text-[#00b032] group-hover:underline"
                                                >
                                                    <span>View details</span>
                                                    <ExternalLink className="size-3.5" />
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div
                                        className="flex items-center gap-1.5 shrink-0 self-center"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {isUnread && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAsRead(notification.id);
                                                }}
                                                title="Mark as read"
                                                className="grid size-8 place-items-center rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                                            >
                                                <Check className="size-4" />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteNotification({ id: notification.id });
                                            }}
                                            title="Delete notification"
                                            className="grid size-8 place-items-center rounded-xl text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                                        >
                                            <Trash2 className="size-4 text-brand-red" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
