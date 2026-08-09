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
    Plus,
} from "lucide-react";

import { useMoney } from "@/hooks/useMoney";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { controlClassName } from "@/components/ui/form-controls";
import {
    overrideKindLabels,
    overrideKinds,
    type ItemAddOn,
    type OverrideKind,
    type PricedItem,
    unitEconomics,
} from "@/lib/sale-pricing/pricing";
import {
    sampleGroups,
    samplePricedItems,
} from "@/lib/sale-pricing/sample-data";

function AvailabilityBadge({ available }: { available: boolean }) {
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
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
    onAvailabilityToggle,
    onAddOnPriceChange,
    onAddOnAvailabilityToggle,
}: {
    item: PricedItem;
    onPriceChange: (unitId: string, value: string) => void;
    onAvailabilityToggle: (available: boolean) => void;
    onAddOnPriceChange: (addOnId: string, value: string) => void;
    onAddOnAvailabilityToggle: (addOnId: string, available: boolean) => void;
}) {
    const { format } = useMoney();

    return (
        <div
            className={`rounded-xl border border-border bg-card p-4 sm:p-5 transition-all shadow-xs hover:border-primary/30 ${
                item.available ? "" : "opacity-75 bg-muted/20"
            }`}
        >
            {/* Item Header with Name, Availability Badge, and SKU */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground text-sm sm:text-base">
                        {item.name}
                    </p>
                    <AvailabilityBadge available={item.available} />
                </div>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                    {item.sku}
                </span>
            </div>

            {/* Units & Base Selling Prices Table */}
            <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[540px] text-left text-xs sm:text-sm">
                    <thead className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        <tr>
                            <th className="pb-2.5 pr-4">Sold as</th>
                            <th className="pb-2.5 pr-4">Capacity</th>
                            <th className="pb-2.5 pr-4">Selling Price</th>
                            <th className="pb-2.5">Stock Unit Cost</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                        {item.units.map((unit) => {
                            const price = item.basePrices[unit.id];
                            const stockCost =
                                item.unitCost !== undefined
                                    ? item.unitCost * unit.factor
                                    : undefined;

                            return (
                                <tr key={unit.id} className="group">
                                    <td className="py-3 pr-4 font-medium text-foreground text-xs sm:text-sm">
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
                                                aria-label={`${item.name} ${unit.label} selling price`}
                                                className={`${controlClassName} h-9 pl-6 pr-2 text-xs sm:text-sm font-semibold`}
                                            />
                                        </div>
                                    </td>
                                    <td className="py-3 text-xs sm:text-sm">
                                        {stockCost === undefined ? (
                                            <span className="text-muted-foreground">
                                                —
                                            </span>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium cursor-not-allowed select-none bg-muted/80 text-muted-foreground border border-border/60"
                                                    title="Stock purchase cost recorded when adding stock in Inventory Management"
                                                >
                                                    {format(stockCost)} /{" "}
                                                    {item.baseUnitLabel.toLowerCase()}
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Add-ons & Modifiers Section */}
            {item.addOns && item.addOns.length > 0 && (
                <div className="mt-4 border-t border-border/60 pt-3">
                    <p className="text-xs font-bold text-foreground tracking-wide uppercase mb-2">
                        Add-ons &amp; Modifiers
                    </p>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[480px] text-left text-xs sm:text-sm">
                            <thead className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                <tr>
                                    <th className="pb-2 pr-4">Sold as</th>
                                    <th className="pb-2 pr-4">Selling Price</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {item.addOns.map((addOn) => (
                                    <tr key={addOn.id}>
                                        <td className="py-2.5 pr-4 font-medium text-foreground text-xs sm:text-sm">
                                            {addOn.name}
                                        </td>
                                        <td className="py-2.5 pr-4">
                                            <div className="relative flex items-center max-w-[140px]">
                                                <span className="absolute left-2.5 text-xs font-semibold text-muted-foreground">
                                                    $
                                                </span>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={addOn.price}
                                                    onChange={(e) =>
                                                        onAddOnPriceChange(addOn.id, e.target.value)
                                                    }
                                                    className={`${controlClassName} h-8 pl-6 pr-2 text-xs font-semibold`}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export function ItemsPricingTab() {
    const [items, setItems] = useState<PricedItem[]>(samplePricedItems);
    const [searchQuery, setSearchQuery] = useState("");
    const [ruleFilter, setRuleFilter] = useState<OverrideKind>("INHERIT");
    const [ruleValue, setRuleValue] = useState("0");
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

    function handleResetRule() {
        setRuleFilter("INHERIT");
        setRuleValue("0");
        setHasUnsavedChanges(false);
    }

    function handleSaveRule() {
        setHasUnsavedChanges(false);
        const val = Number(ruleValue) || 0;
        if (ruleFilter === "INHERIT" || val === 0) return;

        setItems((current) =>
            current.map((item) => {
                const newPrices = { ...item.basePrices };
                item.units.forEach((unit) => {
                    const originalPrice = samplePricedItems.find((i) => i.id === item.id)?.basePrices[unit.id];
                    if (originalPrice !== undefined) {
                        if (ruleFilter === "MARKUP_PERCENT") {
                            newPrices[unit.id] = Number((originalPrice * (1 + val / 100)).toFixed(2));
                        } else if (ruleFilter === "MARKUP_AMOUNT") {
                            newPrices[unit.id] = Number((originalPrice + val).toFixed(2));
                        }
                    }
                });
                return { ...item, basePrices: newPrices };
            }),
        );
    }

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

    function toggleItemAvailability(itemId: string, available: boolean) {
        setItems((current) =>
            current.map((item) =>
                item.id === itemId ? { ...item, available } : item,
            ),
        );
    }

    function setAddOnPrice(itemId: string, addOnId: string, value: string) {
        const price = Number(value) || 0;
        setItems((current) =>
            current.map((item) =>
                item.id === itemId
                    ? {
                          ...item,
                          addOns: item.addOns?.map((ao) =>
                              ao.id === addOnId ? { ...ao, price } : ao,
                          ),
                      }
                    : item,
            ),
        );
    }

    function toggleAddOnAvailability(
        itemId: string,
        addOnId: string,
        available: boolean,
    ) {
        setItems((current) =>
            current.map((item) =>
                item.id === itemId
                    ? {
                          ...item,
                          addOns: item.addOns?.map((ao) =>
                              ao.id === addOnId ? { ...ao, available } : ao,
                          ),
                      }
                    : item,
            ),
        );
    }

    function addAddOn(itemId: string, name: string, price: number) {
        const newAddOn: ItemAddOn = {
            id: `ao-${Date.now()}`,
            name,
            price,
            available: true,
        };
        setItems((current) =>
            current.map((item) =>
                item.id === itemId
                    ? {
                          ...item,
                          addOns: [...(item.addOns ?? []), newAddOn],
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
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                        type="text"
                        placeholder="Search items by name or SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`${controlClassName} h-10 pl-10 pr-8 text-xs sm:text-sm font-medium bg-card shadow-2xs border-border`}
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

                <div className="flex flex-wrap items-center gap-3 ml-auto">
                    <div className="flex items-center gap-2">
                        <div className="w-40 sm:w-44 shrink-0">
                            <Select
                                value={ruleFilter}
                                items={overrideKindLabels}
                                onValueChange={(val) => {
                                    const nextKind = (val || "INHERIT") as OverrideKind;
                                    setRuleFilter(nextKind);
                                    if (nextKind !== "INHERIT") {
                                        setHasUnsavedChanges(true);
                                    } else {
                                        handleResetRule();
                                    }
                                }}
                            >
                                <SelectTrigger
                                    size="sm"
                                    aria-label="Rule filter"
                                    className={`${controlClassName} !h-10 px-3.5 text-sm font-semibold rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-all shrink-0`}
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {overrideKinds.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {overrideKindLabels[option]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {ruleFilter !== "INHERIT" && (
                            <div className="relative flex items-center">
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={ruleValue}
                                    onChange={(e) => {
                                        setRuleValue(e.target.value);
                                        setHasUnsavedChanges(true);
                                    }}
                                    placeholder="0"
                                    className={`${controlClassName} !h-10 w-28 bg-card pl-3.5 pr-7 text-sm font-semibold rounded-xl`}
                                />
                                <span className="absolute right-2.5 text-xs font-bold text-muted-foreground pointer-events-none">
                                    {ruleFilter === "MARKUP_PERCENT" ? "%" : "$"}
                                </span>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={toggleExpandAll}
                        className="flex items-center gap-1.5 h-10 px-3.5 text-xs sm:text-sm font-semibold text-foreground rounded-xl border border-border bg-card hover:bg-muted/60 transition-all shadow-2xs"
                    >
                        <ChevronDown
                            className={`size-3.5 transition-transform duration-200 ${
                                collapsed.size > 0 ? "-rotate-90" : ""
                            }`}
                        />
                        {collapsed.size > 0 ? "Expand All" : "Collapse All"}
                    </button>
                </div>

                {ruleFilter !== "INHERIT" && (
                    <div className="mt-2 flex w-full items-center justify-end gap-2.5 pt-3 border-t border-border/40 animate-in fade-in duration-200">
                        <button
                            type="button"
                            onClick={handleResetRule}
                            className="h-10 px-4 text-xs sm:text-sm font-semibold bg-[#D14341] text-white hover:bg-[#D14341]/90 rounded-xl shadow-xs transition-colors"
                        >
                            Reset
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveRule}
                            className="h-10 px-5 text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-xs transition-colors"
                        >
                            Save Changes
                        </button>
                    </div>
                )}
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
                                <h2 className="font-semibold text-foreground text-sm sm:text-base">
                                    {group.name}
                                </h2>
                                <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
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
                                        onAvailabilityToggle={(available) =>
                                            toggleItemAvailability(item.id, available)
                                        }
                                        onAddOnPriceChange={(addOnId, value) =>
                                            setAddOnPrice(item.id, addOnId, value)
                                        }
                                        onAddOnAvailabilityToggle={(addOnId, available) =>
                                            toggleAddOnAvailability(item.id, addOnId, available)
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
