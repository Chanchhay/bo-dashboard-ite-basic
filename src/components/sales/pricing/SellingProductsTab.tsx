"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

import { useMoney } from "@/hooks/useMoney";

import { Button } from "@/components/ui/button";
import { controlClassName } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    buildOverride,
    describeOverride,
    effectivePrice,
    isOverridden,
    listingKey,
    overrideKindLabels,
    overrideKinds,
    overrideValue,
    type ChannelListing,
    type OverrideKind,
} from "@/lib/sale-pricing/pricing";
import {
    sampleChannels,
    sampleListings,
    samplePricedItems,
    sampleSchedules,
} from "@/lib/sale-pricing/sample-data";
import { ChannelScheduleCard } from "@/components/sales/pricing/ChannelScheduleCard";
import {
    emptySchedule,
    isOpenAt,
    type ChannelSchedule,
} from "@/lib/sale-pricing/schedule";

/**
 * What one channel sells and for how much.
 *
 * The base price is always shown beside the channel price, because the whole
 * point of the two-layer model is that you can see what you are deviating from
 * — and get back to it.
 */
export function SellingProductsTab() {
    const { format } = useMoney();
    const [listings, setListings] =
        useState<ChannelListing[]>(sampleListings);
    const [schedules, setSchedules] =
        useState<Record<string, ChannelSchedule>>(sampleSchedules);
    const [channelId, setChannelId] = useState(sampleChannels[0]?.id ?? "");

    const channel = sampleChannels.find((entry) => entry.id === channelId);
    const listing = listings.find((entry) => entry.channelId === channelId);

    function updateListing(next: Partial<ChannelListing>) {
        setListings((current) =>
            current.map((entry) =>
                entry.channelId === channelId ? { ...entry, ...next } : entry,
            ),
        );
    }

    function toggleItem(itemId: string, on: boolean) {
        if (!listing) return;

        updateListing({
            itemIds: on
                ? [...listing.itemIds, itemId]
                : listing.itemIds.filter((id) => id !== itemId),
        });
    }

    function setOverride(
        itemId: string,
        unitId: string,
        kind: OverrideKind,
        raw: string,
    ) {
        if (!listing) return;

        const key = listingKey(itemId, unitId);
        const next = { ...listing.overrides };

        if (kind === "INHERIT") {
            delete next[key];
        } else {
            next[key] = buildOverride(kind, raw);
        }

        updateListing({ overrides: next });
    }

    const listedCount = listing?.itemIds.length ?? 0;
    const overrideCount = Object.keys(listing?.overrides ?? {}).length;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
                {sampleChannels.map((entry) => {
                    const active = entry.id === channelId;
                    const count =
                        listings.find((row) => row.channelId === entry.id)
                            ?.itemIds.length ?? 0;
                    const open = isOpenAt(
                        schedules[entry.id] ?? emptySchedule(),
                        new Date(),
                    );

                    return (
                        <button
                            key={entry.id}
                            type="button"
                            onClick={() => setChannelId(entry.id)}
                            aria-pressed={active}
                            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                                active
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                            }`}
                        >
                            <span
                                className={`size-2 shrink-0 rounded-full ${
                                    open ? "bg-success" : "bg-muted-foreground/40"
                                }`}
                                title={open ? "Open now" : "Closed now"}
                            />
                            {entry.name}
                            <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            <ChannelScheduleCard
                channelName={channel?.name ?? "This channel"}
                schedule={schedules[channelId] ?? emptySchedule()}
                onChange={(next) =>
                    setSchedules((current) => ({
                        ...current,
                        [channelId]: next,
                    }))
                }
            />

            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                <div className="border-b border-border p-4 sm:p-5">
                    <h2 className="font-semibold text-foreground">
                        {channel?.name}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {channel?.description} · {listedCount} item
                        {listedCount === 1 ? "" : "s"} listed ·{" "}
                        {overrideCount} price exception
                        {overrideCount === 1 ? "" : "s"}
                    </p>
                </div>

                <div className="divide-y divide-border">
                    {samplePricedItems.map((item) => {
                        const listed = listing?.itemIds.includes(item.id);
                        const sellable = item.available;

                        return (
                            <div key={item.id} className="p-4 sm:p-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold text-foreground">
                                                {item.name}
                                            </p>
                                            {sellable ? null : (
                                                <span
                                                    className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground"
                                                    title="Unavailable in Inventory — it cannot be listed anywhere until that changes"
                                                >
                                                    Unavailable in Inventory
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {item.sku}
                                        </p>
                                    </div>

                                    <label className="flex shrink-0 items-center gap-2.5 text-sm">
                                        <span className="text-muted-foreground">
                                            {listed ? "Selling" : "Not selling"}
                                        </span>
                                        <Switch
                                            checked={Boolean(listed)}
                                            disabled={!sellable}
                                            onCheckedChange={(checked) =>
                                                toggleItem(
                                                    item.id,
                                                    Boolean(checked),
                                                )
                                            }
                                            aria-label={`Sell ${item.name} on ${channel?.name}`}
                                        />
                                    </label>
                                </div>

                                {listed ? (
                                    <div className="mt-4 overflow-x-auto">
                                        <table className="w-full min-w-[680px] text-left text-sm">
                                            <thead className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                <tr>
                                                    <th className="pb-2 pr-4">
                                                        Sold as
                                                    </th>
                                                    <th className="pb-2 pr-4">
                                                        Base
                                                    </th>
                                                    <th className="pb-2 pr-4">
                                                        This channel
                                                    </th>
                                                    <th className="pb-2 pr-4">
                                                        Value
                                                    </th>
                                                    <th className="pb-2">
                                                        Sells for
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {item.units.map((unit) => {
                                                    const base =
                                                        item.basePrices[unit.id];
                                                    const key = listingKey(
                                                        item.id,
                                                        unit.id,
                                                    );
                                                    const override =
                                                        listing?.overrides[key];
                                                    const kind =
                                                        override?.kind ??
                                                        "INHERIT";
                                                    const effective =
                                                        effectivePrice(
                                                            base,
                                                            override,
                                                        );

                                                    // A unit with no base price
                                                    // is not sold at all, so
                                                    // there is nothing here to
                                                    // override.
                                                    if (
                                                        base === undefined &&
                                                        !isOverridden(override)
                                                    ) {
                                                        return (
                                                            <tr key={unit.id}>
                                                                <td className="py-2.5 pr-4 font-medium text-muted-foreground">
                                                                    {unit.label}
                                                                </td>
                                                                <td
                                                                    colSpan={4}
                                                                    className="py-2.5 text-xs text-muted-foreground"
                                                                >
                                                                    No base price
                                                                    — not sold
                                                                </td>
                                                            </tr>
                                                        );
                                                    }

                                                    return (
                                                        <tr key={unit.id}>
                                                            <td className="py-2.5 pr-4 font-medium text-foreground">
                                                                {unit.label}
                                                            </td>
                                                            <td className="py-2.5 pr-4 text-muted-foreground">
                                                                {base ===
                                                                undefined
                                                                    ? "—"
                                                                    : format(
                                                                          base,
                                                                      )}
                                                            </td>
                                                            <td className="py-2.5 pr-4">
                                                                <Select
                                                                    value={kind}
                                                                    onValueChange={(
                                                                        value,
                                                                    ) =>
                                                                        setOverride(
                                                                            item.id,
                                                                            unit.id,
                                                                            (value ||
                                                                                "INHERIT") as OverrideKind,
                                                                            overrideValue(
                                                                                override,
                                                                            ),
                                                                        )
                                                                    }
                                                                    items={
                                                                        overrideKindLabels
                                                                    }
                                                                >
                                                                    <SelectTrigger
                                                                        aria-label={`${unit.label} price rule`}
                                                                        className={`${controlClassName} h-10 w-40 px-3 py-2`}
                                                                    >
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {overrideKinds.map(
                                                                            (
                                                                                option,
                                                                            ) => (
                                                                                <SelectItem
                                                                                    key={
                                                                                        option
                                                                                    }
                                                                                    value={
                                                                                        option
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        overrideKindLabels[
                                                                                            option
                                                                                        ]
                                                                                    }
                                                                                </SelectItem>
                                                                            ),
                                                                        )}
                                                                    </SelectContent>
                                                                </Select>
                                                            </td>
                                                            <td className="py-2.5 pr-4">
                                                                {kind ===
                                                                "INHERIT" ? (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        —
                                                                    </span>
                                                                ) : (
                                                                    <Input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={overrideValue(
                                                                            override,
                                                                        )}
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            setOverride(
                                                                                item.id,
                                                                                unit.id,
                                                                                kind,
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        aria-label={`${unit.label} price value`}
                                                                        className={`${controlClassName} h-10 w-28 px-3 py-2`}
                                                                    />
                                                                )}
                                                            </td>
                                                            <td className="py-2.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold text-foreground">
                                                                        {effective ===
                                                                        undefined
                                                                            ? "—"
                                                                            : format(
                                                                                  effective,
                                                                              )}
                                                                    </span>
                                                                    {isOverridden(
                                                                        override,
                                                                    ) ? (
                                                                        <>
                                                                            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">
                                                                                {describeOverride(
                                                                                    override,
                                                                                )}
                                                                            </span>
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon-xs"
                                                                                aria-label={`Reset ${unit.label} to base price`}
                                                                                title="Reset to base"
                                                                                onClick={() =>
                                                                                    setOverride(
                                                                                        item.id,
                                                                                        unit.id,
                                                                                        "INHERIT",
                                                                                        "",
                                                                                    )
                                                                                }
                                                                            >
                                                                                <RotateCcw />
                                                                            </Button>
                                                                        </>
                                                                    ) : null}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
