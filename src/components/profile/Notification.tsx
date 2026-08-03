"use client"

import * as React from "react"
import Link from "next/link"
import {
    Bell,
    CheckCheck,
    CircleAlertIcon,
    CircleCheckIcon,
    InfoIcon,
    Loader2,
} from "lucide-react"

import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import {
    useGetReceivedNotificationsQuery,
    useMarkAllAsReadMutation,
    useMarkAsReadMutation,
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
    switch (type?.toUpperCase()) {
        case "SUCCESS":
        case "ORDER":
            return <CircleCheckIcon className="size-4 text-[#00932a] shrink-0 mt-0.5" />;
        case "WARNING":
        case "ALERT":
            return <CircleAlertIcon className="size-4 text-amber-500 shrink-0 mt-0.5" />;
        default:
            return <InfoIcon className="size-4 text-[#00932a] shrink-0 mt-0.5" />;
    }
}

export function NotificationMenu() {
    const {
        data,
        isLoading,
        isError,
    } = useGetReceivedNotificationsQuery({
        page: 0,
        size: 10,
        sort: "DESC",
    });

    const [markAsRead] = useMarkAsReadMutation();
    const [markAllAsRead, { isLoading: isMarkingAll }] = useMarkAllAsReadMutation();

    const notifications = data?.content ?? [];
    const unreadNotifications = notifications.filter((n) => !n.read);
    const unreadCount = unreadNotifications.length;

    const handleItemClick = (notification: Notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }
    };

    const handleMarkAllRead = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (unreadCount > 0 && !isMarkingAll) {
            markAllAsRead();
        }
    };

    return (
        <NavigationMenu className="relative">
            <NavigationMenuList>
                <NavigationMenuItem>
                    <NavigationMenuTrigger
                        aria-label="Notifications"
                        className="relative grid size-11 place-items-center rounded-xl border border-[#e2e2de] bg-white text-[#16181c] outline-none transition-colors hover:bg-[#f7f7f6] focus-visible:ring-2 focus-visible:ring-[#00932a] focus:bg-[#f7f7f6]"
                    >
                        <Bell className="size-5" aria-hidden="true" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-[#00932a] text-[10px] font-semibold text-white ring-2 ring-white">
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                        )}
                    </NavigationMenuTrigger>

                    <NavigationMenuContent className="w-[340px] sm:w-[420px] rounded-2xl bg-white p-4 shadow-xl border border-[#e4eae2] right-0 left-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-[#edf0ec] mb-3 px-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-semibold text-[#161d16]">Notifications</h3>
                                {unreadCount > 0 && (
                                    <span className="rounded-full bg-[#00932a]/10 px-2 py-0.5 text-xs font-medium text-[#00932a]">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    type="button"
                                    onClick={handleMarkAllRead}
                                    disabled={isMarkingAll}
                                    className="flex items-center gap-1 text-xs font-medium text-[#00932a] hover:text-[#007020] transition-colors disabled:opacity-50"
                                >
                                    <CheckCheck className="size-3.5" />
                                    <span>Mark all read</span>
                                </button>
                            )}
                        </div>

                        {isLoading && (
                            <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                                <Loader2 className="size-6 animate-spin text-[#00932a]" />
                                <p className="text-xs">Loading notifications...</p>
                            </div>
                        )}

                        {isError && !isLoading && (
                            <div className="py-6 text-center text-xs text-red-500">
                                Failed to load notifications.
                            </div>
                        )}

                        {!isLoading && !isError && notifications.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                                <div className="size-10 rounded-full bg-[#f2f5f1] grid place-items-center text-muted-foreground">
                                    <Bell className="size-5 text-[#8a8f89]" />
                                </div>
                                <p className="text-sm font-medium text-[#161d16]">No notifications yet</p>
                                <p className="text-xs text-[#657064]">We&apos;ll notify you when something important arrives.</p>
                            </div>
                        )}

                        {!isLoading && !isError && notifications.length > 0 && (
                            <ul className="flex flex-col gap-1.5 max-h-[360px] overflow-y-auto pr-1">
                                {notifications.map((notification) => (
                                    <ListItem
                                        key={notification.id}
                                        notification={notification}
                                        onClick={() => handleItemClick(notification)}
                                    />
                                ))}
                            </ul>
                        )}
                    </NavigationMenuContent>
                </NavigationMenuItem>
            </NavigationMenuList>
        </NavigationMenu>
    )
}

export const NavigationMenuDemo = NotificationMenu;

function ListItem({
    notification,
    onClick,
}: {
    notification: Notification;
    onClick: () => void;
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

    const content = (
        <div
            onClick={onClick}
            className={`group relative flex items-start gap-3 p-2.5 rounded-xl transition-all cursor-pointer ${
                isUnread
                    ? "bg-[#f4f8f4] hover:bg-[#eaf3ea]"
                    : "hover:bg-[#f7f7f6]"
            }`}
        >
            {getNotificationIcon(notification.type)}
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm leading-snug truncate ${isUnread ? "font-semibold text-[#161d16]" : "font-medium text-[#3d4a3c]"}`}>
                        {notification.title || "Notification"}
                    </span>
                    {timeAgo && (
                        <span className="text-[11px] text-[#8a8f89] shrink-0">
                            {timeAgo}
                        </span>
                    )}
                </div>
                {senderDisplay && (
                    <span className="text-[11px] font-medium text-[#00932a] truncate">
                        From: {senderDisplay}
                    </span>
                )}
                {notification.content && (
                    <p className="text-xs text-[#657064] line-clamp-2 leading-normal">
                        {notification.content}
                    </p>
                )}
            </div>
            {isUnread && (
                <span className="size-2 rounded-full bg-[#00932a] shrink-0 self-center" />
            )}
        </div>
    );

    return (
        <li>
            {notification.deepLink ? (
                <NavigationMenuLink render={<Link href={href}>{content}</Link>} />
            ) : (
                content
            )}
        </li>
    );
}
