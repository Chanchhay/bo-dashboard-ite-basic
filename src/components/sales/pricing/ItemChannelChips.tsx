"use client";

import { Globe, MessageSquare, Plus, Send, ShoppingBag, Store } from "lucide-react";

import type { SalesChannel } from "@/lib/api/sales-channels";

const channelIcons: Record<string, React.ElementType> = {
    POS: Store,
    WEB: Globe,
    ONLINE: Globe,
    TELEGRAM: Send,
    MESSENGER: MessageSquare,
};

/**
 * Where this item is being sold, on the row that prices it.
 *
 * This is the job the separate channel matrix screen existed to do — answer
 * "which channels is this on" and let it be changed in one go. On the row it
 * answers itself for every item at once, and clicking it opens the same
 * publish form the matrix opened, so nothing is lost by not having the grid.
 */
export function ItemChannelChips({
    channels,
    liveOn,
    onManage,
}: {
    channels: SalesChannel[];
    /** Channel ids this item is currently sold on. */
    liveOn: Set<string>;
    onManage: () => void;
}) {
    const live = channels.filter((channel) => liveOn.has(channel.id));

    return (
        <button
            type="button"
            onClick={onManage}
            title="Choose which channels sell this item"
            aria-label={
                live.length
                    ? `Sold on ${live.map((channel) => channel.name).join(", ")}. Change channels.`
                    : "Not sold on any channel. Choose channels."
            }
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5 transition-colors hover:border-primary/40 hover:bg-muted/60"
        >
            {live.length === 0 ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Plus className="size-3.5" />
                    No channels
                </span>
            ) : (
                live.map((channel) => {
                    const Icon =
                        channelIcons[(channel.code || "").toUpperCase()] ??
                        ShoppingBag;

                    return (
                        <span
                            key={channel.id}
                            title={channel.name}
                            className="grid size-6 place-items-center rounded-lg bg-primary/10 text-primary"
                        >
                            <Icon className="size-3.5" />
                        </span>
                    );
                })
            )}
        </button>
    );
}
