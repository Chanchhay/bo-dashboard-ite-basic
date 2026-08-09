"use client";

import { useMemo, useState } from "react";
import {
    ChevronDown,
    CircleSlash,
    PackageOpen,
    Search,
    AlertTriangle,
    Layers,
    DollarSign,
} from "lucide-react";

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
            className={`rounded-xl border border-border bg-card p-4 sm:p-5 transition-all shadow-xs hover:border-primary/30 ${
                item.available ? "" : "opacity-75 bg-muted/20"
            }`}
        >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground text-base">
                        {item.name}
                    </p>
                    <AvailabilityBadge available={item.available} />
                </div>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                    {item.sku}
                </span>
            </div>

            <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[540px] text-left text-sm">
                    <thead className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        <tr>
                            <th className="pb-2.5 pr-4">Sold as</th>
                            <th className="pb-2.5 pr-4">Capacity</th>
                            <th className="pb-2.5 pr-4">Base Price</th>
                            <th className="pb-2.5">
                                Unit Cost (per {item.baseUnitLabel.toLowerCase()})
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                        {item.units.map((unit) => {
                            const price = item.basePrices[unit.id];
                            const perBase = unitEconomics(price, unit.factor);
                            const basePer = unitEconomics(
                                item.basePrices[baseUnit?.id ?? ""],
                                baseUnit?.factor ?? 1,
                            );

                            const dearer =
                                perBase !== undefined &&
                                basePer !== undefined &&
                                unit.factor > 1 &&
                                perBase > basePer;

                            return (
                                <tr key={unit.id} className="group">
                                    <td className="py-3 pr-4 font-medium text-foreground">
                                        {unit.label}
                                    </td>
                                    <td className="py-3 pr-4 text-xs text-muted-foreground">
                                        {unit.factor === 1
                                            ? "1 base unit"
                                            : `${unit.factor} ${item.baseUnitLabel.toLowerCase()}s`}
                                    </td>
                                    <td className="py-3 pr-4">
                                        <div className="relative flex items-center max-w-[140px]">
                                            <span className="absolute left-2.5 text-xs font-semibold text-muted-foreground">
                                                $
                                            </span>
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
                                                className={`${controlClassName} h-9 pl-6 pr-2 text-xs font-semibold`}
                                            />
                                        </div>
                                    </td>
                                    <td className="py-3 text-xs">
                                        {perBase === undefined ? (
                                            <span className="text-muted-foreground">
                                                —
                                            </span>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium ${
                                                        dearer
                                                            ? "bg-warning/15 text-warning font-semibold"
                                                            : "bg-muted text-muted-foreground"
                                                    }`}
                                                    title={
                                                        dearer
                                                            ? "This package costs more per unit than buying singles"
                                                            : undefined
                                                    }
                                                >
                                                    {dearer && (
                                                        <AlertTriangle className="size-3 shrink-0" />
                                                    )}
                                                    {format(perBase)} /{" "}
                                                    {item.baseUnitLabel.toLowerCase()}
                                                </span>
                                                {dearer && (
                                                    <span className="text-[11px] font-medium text-warning">
                                                        Higher than single
                                                    </span>
                                                )}
                                            </div>
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

export function ItemsPricingTab() {
    const [items, setItems] = useState<PricedItem[]>(samplePricedItems);
    const [searchQuery, setSearchQuery] = useState("");
    const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

    function toggleGroup(groupId: string) {
        setCollapsed((current) => {
            const next = new Set(current);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    }

    function toggleExpandAll() {
        if (collapsed.size > 0) {
            setCollapsed(new Set());
        } else {
            setCollapsed(new Set(sampleGroups.map((g) => g.id)));
        }
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

    const filteredItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return items;
        return items.filter(
            (item) =>
                item.name.toLowerCase().includes(query) ||
                item.sku.toLowerCase().includes(query),
        );
    }, [items, searchQuery]);

    return (
        <div className="flex flex-col gap-4">
            {/* Sleek Search & Filter Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search items by name or SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`${controlClassName} h-10 pl-10 pr-4 text-xs sm:text-sm font-medium bg-card shadow-2xs border-border`}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-medium"
                        >
                            Clear
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3 ml-auto">
                    <span className="text-xs font-medium text-muted-foreground hidden sm:inline-block">
                        Showing <strong className="font-semibold text-foreground">{filteredItems.length}</strong> items
                    </span>
                    <button
                        type="button"
                        onClick={toggleExpandAll}
                        className="flex items-center gap-1.5 h-10 px-3.5 text-xs font-semibold text-foreground rounded-xl border border-border bg-card hover:bg-muted/60 transition-all shadow-2xs"
                    >
                        <ChevronDown
                            className={`size-3.5 transition-transform duration-200 ${
                                collapsed.size > 0 ? "-rotate-90" : ""
                            }`}
                        />
                        {collapsed.size > 0 ? "Expand All" : "Collapse All"}
                    </button>
                </div>
            </div>

            {/* Product Groups */}
            {sampleGroups.map((group) => {
                const groupItems = filteredItems.filter(
                    (item) => item.groupId === group.id,
                );
                const isCollapsed = collapsed.has(group.id);

                if (groupItems.length === 0) return null;

                return (
                    <section
                        key={group.id}
                        className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-all"
                    >
                        <button
                            type="button"
                            onClick={() => toggleGroup(group.id)}
                            aria-expanded={!isCollapsed}
                            className="flex w-full items-center gap-3 border-b border-border p-4 text-left transition-colors hover:bg-muted/50"
                        >
                            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                                <PackageOpen className="size-5" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <h2 className="font-semibold text-foreground text-base">
                                    {group.name}
                                </h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {groupItems.length} item
                                    {groupItems.length === 1 ? "" : "s"}
                                </p>
                            </div>
                            <ChevronDown
                                className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                                    isCollapsed ? "-rotate-90" : ""
                                }`}
                            />
                        </button>

                        {isCollapsed ? null : (
                            <div className="flex flex-col gap-4 p-4">
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
