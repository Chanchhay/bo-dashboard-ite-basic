"use client";

import { useState } from "react";
import { ChevronDown, CircleSlash, PackageOpen } from "lucide-react";

import { useMoney } from "@/hooks/useMoney";

import { Input } from "@/components/ui/input";
import { controlClassName } from "@/components/ui/form-controls";
import { unitEconomics, type PricedItem } from "@/lib/sale-pricing/pricing";
import {
    sampleGroups,
    samplePricedItems,
} from "@/lib/sale-pricing/sample-data";

function AvailabilityBadge({ available }: { available: boolean }) {
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                available
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
            }`}
            title="Set in Inventory — an inactive item cannot be sold on any channel"
        >
            {available ? null : <CircleSlash className="size-3" />}
            {available ? "Available" : "Unavailable"}
        </span>
    );
}

function ItemCard({
    item,
    onPriceChange,
}: {
    item: PricedItem;
    onPriceChange: (unitId: string, value: string) => void;
}) {
    const { format } = useMoney();
    const baseUnit = item.units[0];

    return (
        <div
            className={`rounded-xl border border-border p-4 ${
                item.available ? "" : "opacity-70"
            }`}
        >
            <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-foreground">{item.name}</p>
                <AvailabilityBadge available={item.available} />
                <span className="text-xs text-muted-foreground">
                    {item.sku}
                </span>
            </div>

            <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        <tr>
                            <th className="pb-2 pr-4">Sold as</th>
                            <th className="pb-2 pr-4">Holds</th>
                            <th className="pb-2 pr-4">Price</th>
                            <th className="pb-2">
                                Per {item.baseUnitLabel.toLowerCase()}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {item.units.map((unit) => {
                            const price = item.basePrices[unit.id];
                            const perBase = unitEconomics(price, unit.factor);
                            const basePer = unitEconomics(
                                item.basePrices[baseUnit?.id ?? ""],
                                baseUnit?.factor ?? 1,
                            );
                            // A package that costs more per unit than buying
                            // singles is almost always a typo, so it is called
                            // out rather than left to be discovered at the till.
                            const dearer =
                                perBase !== undefined &&
                                basePer !== undefined &&
                                unit.factor > 1 &&
                                perBase > basePer;

                            return (
                                <tr key={unit.id}>
                                    <td className="py-2.5 pr-4 font-medium text-foreground">
                                        {unit.label}
                                    </td>
                                    <td className="py-2.5 pr-4 text-muted-foreground">
                                        {unit.factor === 1
                                            ? "base unit"
                                            : `${unit.factor} ${item.baseUnitLabel.toLowerCase()}`}
                                    </td>
                                    <td className="py-2.5 pr-4">
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={price ?? ""}
                                            onChange={(event) =>
                                                onPriceChange(
                                                    unit.id,
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Not sold"
                                            aria-label={`${item.name} ${unit.label} price`}
                                            className={`${controlClassName} h-10 w-32 px-3 py-2`}
                                        />
                                    </td>
                                    <td className="py-2.5 text-xs">
                                        {perBase === undefined ? (
                                            <span className="text-muted-foreground">
                                                —
                                            </span>
                                        ) : (
                                            <span
                                                className={
                                                    dearer
                                                        ? "font-semibold text-warning"
                                                        : "text-muted-foreground"
                                                }
                                                title={
                                                    dearer
                                                        ? "This package costs more per unit than buying singles"
                                                        : undefined
                                                }
                                            >
                                                {format(perBase)}
                                                {dearer ? " — dearer than singles" : ""}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/**
 * The base price list, grouped the way the catalogue is grouped.
 *
 * One price per item per sellable unit. Leaving a unit blank means it is simply
 * not sold — which is how an item stocked in grams offers only bags.
 */
export function ItemsPricingTab() {
    const [items, setItems] = useState<PricedItem[]>(samplePricedItems);
    const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

    function toggleGroup(groupId: string) {
        setCollapsed((current) => {
            const next = new Set(current);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    }

    function setPrice(itemId: string, unitId: string, value: string) {
        setItems((current) =>
            current.map((item) =>
                item.id === itemId
                    ? {
                          ...item,
                          basePrices: {
                              ...item.basePrices,
                              [unitId]:
                                  value.trim() === ""
                                      ? undefined
                                      : Number(value),
                          },
                      }
                    : item,
            ),
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <p className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground sm:px-5">
                This is the price. Channels start from these numbers and only
                differ where you tell them to, so changing one here moves every
                channel that has no exception of its own.
            </p>

            {sampleGroups.map((group) => {
                const groupItems = items.filter(
                    (item) => item.groupId === group.id,
                );
                const isCollapsed = collapsed.has(group.id);

                if (groupItems.length === 0) return null;

                return (
                    <section
                        key={group.id}
                        className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
                    >
                        <button
                            type="button"
                            onClick={() => toggleGroup(group.id)}
                            aria-expanded={!isCollapsed}
                            className="flex w-full items-center gap-3 border-b border-border p-4 text-left transition-colors hover:bg-muted/50"
                        >
                            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                                <PackageOpen className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <h2 className="font-semibold text-foreground">
                                    {group.name}
                                </h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {groupItems.length} item
                                    {groupItems.length === 1 ? "" : "s"}
                                </p>
                            </div>
                            <ChevronDown
                                className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                                    isCollapsed ? "-rotate-90" : ""
                                }`}
                            />
                        </button>

                        {isCollapsed ? null : (
                            <div className="flex flex-col gap-3 p-4">
                                {groupItems.map((item) => (
                                    <ItemCard
                                        key={item.id}
                                        item={item}
                                        onPriceChange={(unitId, value) =>
                                            setPrice(item.id, unitId, value)
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                );
            })}
        </div>
    );
}
