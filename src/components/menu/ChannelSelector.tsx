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
    { name: string; description: string; icon: React.ElementType; color: string }
> = {
    POS: {
        name: "Point of Sale (POS)",
        description: "Items available to sell at the in-store till.",
        icon: Store,
        color: "bg-primary/10 text-primary border-primary/20",
    },
    TELEGRAM: {
        name: "Telegram Bot / Store",
        description: "Items synced to your Telegram shop and bot catalog.",
        icon: Send,
        color: "bg-sky-50 text-sky-700 border-sky-200",
    },
    MESSENGER: {
        name: "Facebook Messenger",
        description: "Items available for chat orders in Messenger.",
        icon: MessageSquare,
        color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    // The backend seeds this one as ONLINE; WEB is kept as an alias so an
    // older channel row still renders with the right icon and wording.
    ONLINE: {
        name: "Online Store",
        description: "Items published to your public web store.",
        icon: Globe,
        color: "bg-indigo-50 text-indigo-700 border-blue-200",
    },
    WEB: {
        name: "Web E-Commerce Store",
        description: "Items published to your public web store.",
        icon: Globe,
        color: "bg-indigo-50 text-indigo-700 border-blue-200",
    },
};

export function ChannelSelector({
    channels,
    activeChannelCode,
    selectedChannelCode,
    onSelectChannel,
}: ChannelSelectorProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {channels.map((channel, index) => {
                const codeUpper = (channel.code ?? "").toUpperCase();
                const meta = CHANNEL_METADATA[codeUpper] || {
                    name: channel.name || codeUpper,
                    description: `Channel ${codeUpper}`,
                    icon: ShoppingBag,
                    color: "bg-gray-50 text-gray-700 border-gray-200",
                };
                const Icon = meta.icon;
                const currentCode = (selectedChannelCode ?? activeChannelCode ?? "").toUpperCase();
                const isActive = currentCode === codeUpper;

                return (
                    <button
                        key={channel.id || channel.code || index}
                        type="button"
                        onClick={() => onSelectChannel(channel.code)}
                        aria-pressed={isActive}
                        className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left ${
                            isActive
                                ? "border-primary bg-primary/10 dark:bg-[#00932a]/20 ring-2 ring-primary/20 shadow-xs"
                                : "border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] hover:border-gray-300 dark:hover:border-[#384252] hover:bg-gray-50/50 dark:hover:bg-[#252a38]"
                        }`}
                    >
                        <div className="flex items-center justify-between w-full">
                            <span className={`p-2 rounded-lg ${meta.color}`}>
                                <Icon className="w-5 h-5" />
                            </span>
                        </div>
                        <span className="mt-3 font-semibold text-sm text-[#161d16] dark:text-[#f8fafc]">{channel.name}</span>
                        <span className="text-xs text-gray-500 dark:text-[#94a3b8] font-mono mt-0.5">
                            Code: {channel.code}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
