"use client";

import { Globe, MessageSquare, Send, ShoppingBag, Store } from "lucide-react";
import type { SalesChannelCode } from "@/lib/api/sales-channels";

interface SalesChannelOption {
    id: string;
    name: string;
    code: SalesChannelCode;
    isActive: boolean;
}

interface ChannelSelectorProps {
    channels: SalesChannelOption[];
    activeChannelCode: string;
    selectedChannelCode?: string;
    onSelectChannel: (code: string) => void;
}

const CHANNEL_METADATA: Record<
    string,
    { name: string; icon: React.ElementType }
> = {
    POS: {
        name: "Point of Sale (POS)",
        icon: Store,
    },
    TELEGRAM: {
        name: "Telegram Bot",
        icon: Send,
    },
    MESSENGER: {
        name: "Facebook Messenger",
        icon: MessageSquare,
    },
    ONLINE: {
        name: "Online Store",
        icon: Globe,
    },
    WEB: {
        name: "Web Store",
        icon: Globe,
    },
};

export function ChannelSelector({
    channels,
    activeChannelCode,
    selectedChannelCode,
    onSelectChannel,
}: ChannelSelectorProps) {
    const currentCodeUpper = (selectedChannelCode || activeChannelCode).toUpperCase();

    return (
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">
                Active Channel:
            </span>
            {channels.map((channel) => {
                const codeUpper = channel.code.toUpperCase();
                const meta = CHANNEL_METADATA[codeUpper] || {
                    name: channel.name,
                    icon: ShoppingBag,
                };
                const Icon = meta.icon;
                const isActive = currentCodeUpper === codeUpper;

                return (
                    <button
                        key={channel.id || channel.code}
                        type="button"
                        onClick={() => onSelectChannel(channel.code)}
                        aria-pressed={isActive}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            isActive
                                ? "bg-primary text-white shadow-xs ring-2 ring-primary/20 scale-[1.02]"
                                : "bg-card border border-border text-foreground hover:bg-muted/70"
                        }`}
                    >
                        <Icon className="w-4 h-4" />
                        <span>{channel.name}</span>
                        <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                                isActive
                                    ? "bg-white/20 text-white"
                                    : "bg-muted text-muted-foreground"
                            }`}
                        >
                            {channel.code}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
