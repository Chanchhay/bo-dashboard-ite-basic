"use client"

import * as React from "react"
import Link from "next/link"
import {
    Bell,
    CheckCheck,
    CircleAlert,
    CircleCheck,
    Info,
    Loader2,
    TriangleAlert,
    Inbox,
    Trash2,
    ShoppingBag,
    CreditCard,
    Package,
    Tag,
} from "lucide-react"

import {
    Menu,
    MenuContent,
    MenuTrigger,
} from "@/components/ui/menu"
import { authClient } from "@/lib/auth/auth-client"
import { notificationSocket } from "@/lib/notification-socket"
import {
    useGetReceivedNotificationsQuery,
    useMarkAllAsReadMutation,
    useMarkAsReadMutation,
    useDeleteNotificationMutation,
} from "@/services/notificationApi"
import type { Notification } from "@/lib/api/notification"

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

function getNotificationIcon(type?: string | null) {
    const t = type?.toUpperCase();
    switch (t) {
        case "ORDER":
        case "SUCCESS":
            return (
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/80">
                    <ShoppingBag className="size-5.5" />
                </div>
            );
        case "PAYMENT":
            return (
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100/80">
                    <CreditCard className="size-5.5" />
                </div>
            );
        case "INVENTORY":
        case "LOW_STOCK":
        case "WARNING":
        case "ALERT":
            return (
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100/80">
                    <Package className="size-5.5" />
                </div>
            );
        case "PROMOTION":
            return (
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100/80">
                    <Tag className="size-5.5" />
                </div>
            );
        case "SYSTEM":
        case "ERROR":
        case "DANGER":
            return (
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100/80">
                    <CircleAlert className="size-5.5" />
                </div>
            );
        default:
            return (
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#f0f7f1] text-[#00932a] border border-[#e4eae2]">
                    <Bell className="size-5.5" />
                </div>
            );
    }
}

export function NotificationMenu({ className }: { className?: string }) {
    const [filter, setFilter] = React.useState<"ALL" | "UNREAD">("ALL");
    const [pageSize, setPageSize] = React.useState<number>(20);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const { data: session } = authClient.useSession();

    React.useEffect(() => {
        if (session?.user?.id) {
            notificationSocket.connect({
                receiverId: session.user.id,
                userId: session.user.id,
            });
        }
    }, [session?.user?.id]);

    const {
        data,
        isLoading,
        isFetching,
        isError,
        refetch,
    } = useGetReceivedNotificationsQuery({
        page: 0,
        size: pageSize,
        sort: "createdDate,desc",
    });

    const [markAsRead] = useMarkAsReadMutation();
    const [markAllAsRead, { isLoading: isMarkingAll }] = useMarkAllAsReadMutation();
    const [deleteNotification] = useDeleteNotificationMutation();

    const notifications = data?.content ?? [];
    const unreadNotifications = notifications.filter((n) => !n.read);
    const unreadCount = unreadNotifications.length;

    const displayedNotifications =
        filter === "UNREAD" ? unreadNotifications : notifications;

    const totalElements = data?.page?.totalElements ?? notifications.length;
    const hasMore = totalElements > notifications.length;

    const handleLoadMore = () => {
        if (!isFetching && hasMore) {
            setPageSize((prev) => prev + 20);
        }
    };

    const handleItemClick = (notification: Notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }
    };

    const handleDeleteItem = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.blur();
        }

        const container = scrollContainerRef.current;
        const currentScrollTop = container ? container.scrollTop : 0;

        deleteNotification({ id });

        if (container) {
            requestAnimationFrame(() => {
                container.scrollTop = currentScrollTop;
            });
        }
    };

    const handleMarkAllRead = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (unreadCount > 0 && !isMarkingAll) {
            markAllAsRead();
        }
    };

    return (
        <Menu>
            <MenuTrigger
                aria-label="Notifications"
                className={`relative grid size-12 place-items-center rounded-xl border border-[#e2e2de] bg-white text-[#16181c] outline-none transition-colors hover:bg-[#f7f7f6] focus-visible:ring-2 focus-visible:ring-[#00932a] focus:bg-[#f7f7f6] ${className ?? ""}`}
            >
                <Bell className="size-5.5" aria-hidden="true" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-[#00932a] text-xs font-bold text-white ring-2 ring-white shadow-xs">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </MenuTrigger>

            <MenuContent
                align="end"
                sideOffset={8}
                className="w-[420px] sm:w-[480px] p-0 rounded-2xl border border-[#e4eae2] bg-white shadow-[0_20px_50px_rgba(15,26,18,0.14)] overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-4.5 pb-4 border-b border-[#edf0ec]">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-[#161d16]">Notifications</h3>
                        {unreadCount > 0 && (
                            <span className="rounded-full bg-[#00932a]/10 px-3 py-1 text-sm font-bold text-[#00932a]">
                                {unreadCount} new
                            </span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={handleMarkAllRead}
                            disabled={isMarkingAll}
                            className="flex items-center gap-1.5 text-sm font-bold text-[#00932a] hover:text-[#007020] transition-colors disabled:opacity-50 outline-none rounded-md focus-visible:ring-2 focus-visible:ring-[#00932a]"
                        >
                            <CheckCheck className="size-4.5" />
                            <span>Mark all read</span>
                        </button>
                    )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-2.5 px-5 py-3 border-b border-[#edf0ec]/80 bg-[#fafbfa]">
                    <button
                        type="button"
                        onClick={() => setFilter("ALL")}
                        className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors cursor-pointer ${
                            filter === "ALL"
                                ? "bg-white text-[#161d16] shadow-xs border border-[#e4eae2]"
                                : "text-[#657064] hover:text-[#161d16] hover:bg-black/5"
                        }`}
                    >
                        All
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter("UNREAD")}
                        className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors cursor-pointer ${
                            filter === "UNREAD"
                                ? "bg-white text-[#161d16] shadow-xs border border-[#e4eae2]"
                                : "text-[#657064] hover:text-[#161d16] hover:bg-black/5"
                        }`}
                    >
                        Unread
                    </button>
                </div>

                {/* Body Content */}
                <div ref={scrollContainerRef} className="max-h-[460px] overflow-y-auto">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-[#657064]">
                            <Loader2 className="size-7 animate-spin text-[#00932a]" />
                            <p className="text-base font-semibold">Loading notifications...</p>
                        </div>
                    )}

                    {isError && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-10 px-5 text-center gap-2.5">
                            <p className="text-base text-red-500 font-bold">Failed to load notifications.</p>
                            <button
                                type="button"
                                onClick={() => refetch()}
                                className="text-base text-[#00932a] hover:underline font-bold cursor-pointer"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {!isLoading && !isError && displayedNotifications.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 px-5 text-center gap-3">
                            <div className="grid size-14 place-items-center rounded-2xl bg-[#f0f4f0] text-[#657064]">
                                <Inbox className="size-7 text-[#657064]" />
                            </div>
                            <p className="text-lg font-bold text-[#161d16]">
                                {filter === "UNREAD" ? "No unread notifications" : "No notifications yet"}
                            </p>
                            <p className="text-base text-[#657064] max-w-[280px] leading-relaxed">
                                {filter === "UNREAD"
                                    ? "You're all caught up! Check the All tab to view past updates."
                                    : "We'll notify you when something important arrives."}
                            </p>
                        </div>
                    )}

                    {!isLoading && !isError && displayedNotifications.length > 0 && (
                        <div>
                            <div className="divide-y divide-[#edf0ec]">
                                {displayedNotifications.map((notification) => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onClick={() => handleItemClick(notification)}
                                        onDelete={(e) => handleDeleteItem(notification.id, e)}
                                    />
                                ))}
                            </div>

                            {filter === "ALL" && hasMore && (
                                <div className="p-4 text-center border-t border-[#edf0ec] bg-[#fafbfa]">
                                    <button
                                        type="button"
                                        onClick={handleLoadMore}
                                        disabled={isFetching}
                                        className="w-full py-3 px-5 text-base font-bold text-[#00932a] bg-white border border-[#e4eae2] hover:bg-[#f2f7f2] rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-[#00932a]"
                                    >
                                        {isFetching ? (
                                            <>
                                                <Loader2 className="size-5 animate-spin text-[#00932a]" />
                                                <span>Loading previous notifications...</span>
                                            </>
                                        ) : (
                                            <span>See previous notifications</span>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && unreadCount === 0 && (
                    <div className="flex items-center justify-center px-5 py-3 border-t border-[#edf0ec] bg-[#fafbfa] text-sm font-bold">
                        <span className="flex items-center gap-2 text-emerald-600">
                            <CheckCheck className="size-4.5" /> All caught up
                        </span>
                    </div>
                )}
            </MenuContent>
        </Menu>
    )
}

export const NavigationMenuDemo = NotificationMenu;

function NotificationItem({
    notification,
    onClick,
    onDelete,
}: {
    notification: Notification;
    onClick: () => void;
    onDelete: (e: React.MouseEvent) => void;
}) {
    const timeAgo = formatTimeAgo(notification.createdAt);
    const isUnread = !notification.read;
    const href = notification.deepLink || "#";

    const isUuid = (str?: string | null) =>
        Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

    const getSenderLabel = (name?: string | null, id?: string | null) => {
        if (name && !isUuid(name)) return name;
        if (id && !isUuid(id)) return id;
        if (id && isUuid(id)) return `User (${id.slice(0, 8)})`;
        return null;
    };

    const senderDisplay = getSenderLabel(notification.senderName, notification.senderId);

    const innerContent = (
        <div
            onClick={onClick}
            className={`group relative flex items-start gap-4 p-4.5 transition-colors cursor-pointer select-none ${
                isUnread
                    ? "bg-[#f4f9f4] hover:bg-[#eaf4ea]"
                    : "bg-white hover:bg-[#f7f7f6]"
            }`}
        >
            {getNotificationIcon(notification.type)}

            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span
                            className={`text-base leading-snug truncate ${
                                isUnread ? "font-bold text-[#161d16]" : "font-bold text-[#3d4a3c]"
                            }`}
                        >
                            {notification.title || "Notification"}
                        </span>
                        {notification.type && (
                            <span className="rounded-md bg-[#edf0ec] px-2.5 py-0.5 text-xs font-bold text-[#3d4a3c] uppercase tracking-wider shrink-0 border border-[#e2e6e1]">
                                {notification.type}
                            </span>
                        )}
                    </div>
                    {timeAgo && (
                        <span className="text-sm font-semibold text-[#737872] shrink-0 mt-0.5">
                            {timeAgo}
                        </span>
                    )}
                </div>

                {senderDisplay && (
                    <span className="text-sm font-bold text-[#00932a] truncate">
                        From: {senderDisplay}
                    </span>
                )}

                {notification.content && (
                    <p className="text-sm text-[#3d4a3c] line-clamp-2 leading-relaxed">
                        {notification.content}
                    </p>
                )}
            </div>

            <div className="flex items-center gap-2 shrink-0 self-center">
                {isUnread && (
                    <span
                        className="size-3 rounded-full bg-[#00932a] shrink-0 ring-2 ring-white shadow-xs group-hover:hidden"
                        title="Unread"
                    />
                )}
                <button
                    type="button"
                    onClick={onDelete}
                    title="Delete notification"
                    className="hidden group-hover:grid size-9 place-items-center rounded-xl text-[#8a8f89] hover:text-red-600 hover:bg-red-50 transition-colors outline-none"
                >
                    <Trash2 className="size-5" />
                </button>
            </div>
        </div>
    );

    if (notification.deepLink) {
        return (
            <Link href={href} className="block outline-none focus-visible:bg-[#eaf4ea]">
                {innerContent}
            </Link>
        );
    }

    return innerContent;
}


