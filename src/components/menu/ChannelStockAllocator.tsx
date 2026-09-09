"use client";

import { AlertTriangle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { SalesChannel } from "@/lib/api/sales-channels";
import type { ChannelStockDraft } from "@/components/menu/useChannelStockDraft";

export function ChannelStockAllocator({
    draft,
    channels,
    checkedChannelIds,
}: {
    draft: ChannelStockDraft;
    channels: SalesChannel[];
    checkedChannelIds: Set<string>;
}) {
    const selling = channels.filter((channel) => checkedChannelIds.has(channel.id));
    const split = draft.mode === "ALLOCATED";
    const remaining = draft.remainingFor(checkedChannelIds);
    const sellingIds = selling.map((channel) => channel.id);

    const columns = `minmax(7rem, 1.2fr) repeat(${selling.length}, minmax(5.5rem, 1fr)) minmax(9rem, auto)`;

    return (
        <div className="space-y-3 rounded-xl bg-muted/30 p-3.5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-foreground">
                        Split stock across channels
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {split
                            ? "Each channel may sell up to the number you set. Anything left over is held back."
                            : "Every channel sells from the full stock on hand."}
                    </p>
                </div>
                <Switch
                    checked={split}
                    onCheckedChange={(checked) =>
                        draft.setMode(checked ? "ALLOCATED" : "SHARED")
                    }
                />
            </div>

            {draft.isUnavailable && (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertTriangle className="size-3.5" />
                    Could not read this item&apos;s split. Saving one may fail.
                </p>
            )}

            {split && selling.length === 0 && (
                <p className="text-xs text-muted-foreground">
                    Tick a channel above to give it a share.
                </p>
            )}

            {split && selling.length > 0 && (
                <>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() =>
                                draft.targets.forEach((target) =>
                                    draft.distributeEvenly(
                                        sellingIds,
                                        target.variantId,
                                    ),
                                )
                            }
                            className="cursor-pointer rounded-lg bg-background px-2.5 py-1 text-xs font-normal text-primary hover:underline"
                        >
                            Split evenly
                        </button>
                        <button
                            type="button"
                            onClick={draft.clearAll}
                            className="cursor-pointer rounded-lg bg-background px-2.5 py-1 text-xs font-normal text-muted-foreground hover:underline"
                        >
                            Clear
                        </button>
                    </div>

                    <div className="-mx-1 overflow-x-auto px-1 pb-1">
                        <div className="min-w-fit space-y-1.5">
                            <div
                                className="grid items-end gap-2"
                                style={{ gridTemplateColumns: columns }}
                            >
                                <span className="text-xs font-medium text-muted-foreground">
                                    {draft.targets.length > 1 ? "Option" : "Item"}
                                </span>
                                {selling.map((channel) => (
                                    <span
                                        key={channel.id}
                                        title={channel.name}
                                        className="truncate text-center text-xs font-medium text-foreground"
                                    >
                                        {channel.name}
                                    </span>
                                ))}
                                <span className="text-right text-xs font-medium text-muted-foreground">
                                    On hand
                                </span>
                            </div>

                            {draft.targets.map((target) => {
                                const left = remaining.get(target.variantId || "") ?? 0;
                                const over = left < 0;

                                return (
                                    <div
                                        key={target.variantId || "item"}
                                        className="grid items-center gap-2 rounded-lg py-1"
                                        style={{ gridTemplateColumns: columns }}
                                    >
                                        <button
                                            type="button"
                                            title={`Divide ${target.name} evenly`}
                                            onClick={() =>
                                                draft.distributeEvenly(
                                                    sellingIds,
                                                    target.variantId,
                                                )
                                            }
                                            className="cursor-pointer truncate text-left text-sm font-normal text-foreground hover:text-primary hover:underline"
                                        >
                                            {target.name}
                                        </button>

                                        {selling.map((channel) => (
                                            <Input
                                                key={channel.id}
                                                inputMode="numeric"
                                                className="h-9 w-full text-center"
                                                placeholder="0"
                                                aria-label={`${channel.name} share of ${target.name}`}
                                                aria-invalid={over || undefined}
                                                value={draft.quantityAt(
                                                    channel.id,
                                                    target.variantId,
                                                )}
                                                onChange={(event) =>
                                                    draft.setQuantity(
                                                        channel.id,
                                                        target.variantId,
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        ))}

                                        <span
                                            className={`text-right text-xs font-medium whitespace-nowrap ${
                                                over
                                                    ? "text-destructive"
                                                    : "text-muted-foreground"
                                            }`}
                                        >
                                            {target.onHand}
                                            <span className="font-normal">
                                                {over
                                                    ? ` · ${Math.abs(left)} over`
                                                    : ` · ${left} left`}
                                            </span>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {split && draft.overAllocated(checkedChannelIds) && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                    <AlertTriangle className="size-3.5" />
                    You have given out more than is on hand.
                </p>
            )}
        </div>
    );
}
