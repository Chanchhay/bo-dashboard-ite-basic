"use client";

import { useMemo, useState } from "react";
import { Check, LoaderCircle, Search, Tag } from "lucide-react";

import {
    getApiErrorMessage,
    InventoryError,
    InventoryLoading,
} from "@/components/inventory/InventoryUi";
import { Button } from "@/components/ui/button";
import { controlClassName } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useMoney } from "@/hooks/useMoney";
import type { InventoryItem, ItemPricingInput } from "@/lib/api/inventory";
import {
    useGetInventoryItemOptionsQuery,
    useUpdateItemPricingMutation,
} from "@/services/inventoryApi";
import { cn } from "@/lib/utils";

/** Prices are typed, so they live as text until they are saved. */
type PriceDraft = Record<string, string>;

/** The item's own price shares the draft map with its options. */
function priceKey(itemId: string, optionName?: string) {
    return optionName === undefined ? itemId : `${itemId}::${optionName}`;
}

function toAmount(draft: string | undefined, saved: number | null | undefined) {
    if (draft === undefined) return saved ?? undefined;

    const typed = draft.trim();

    if (typed === "") return undefined;

    const amount = Number(typed);

    return Number.isFinite(amount) ? Number(amount.toFixed(2)) : undefined;
}

function PriceField({
    value,
    label,
    onChange,
}: {
    value: string;
    label: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="relative flex max-w-[150px] items-center">
            <span className="absolute left-2.5 text-xs font-semibold text-muted-foreground">
                $
            </span>
            <Input
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder="Not priced"
                aria-label={label}
                className={cn(
                    controlClassName,
                    "h-9 pr-2 pl-6 text-sm font-semibold",
                )}
            />
        </div>
    );
}

function ItemPricingCard({
    item,
    drafts,
    onDraftChange,
    readOnly,
}: {
    item: InventoryItem;
    drafts: PriceDraft;
    onDraftChange: (key: string, value: string) => void;
    readOnly: boolean;
}) {
    const { format } = useMoney();
    const { toast } = useToast();
    const [save, saveState] = useUpdateItemPricingMutation();

    const options = (item.variants || []).filter((variant) =>
        variant.name?.trim(),
    );

    const rows = [
        {
            key: priceKey(item.id),
            name: item.name || "Unnamed item",
            base: true,
            saved: item.price,
            available: true,
        },
        ...options.map((variant) => ({
            key: priceKey(item.id, variant.name || ""),
            name: variant.name || "",
            base: false,
            saved: variant.price,
            available: variant.available !== false,
        })),
    ];

    /** What is on screen against what was loaded — nothing else is sent. */
    const edited = rows.some((row) => {
        const draft = drafts[row.key];

        if (draft === undefined) return false;

        return toAmount(draft, row.saved) !== (row.saved ?? undefined);
    });

    async function handleSave() {
        const price = toAmount(drafts[priceKey(item.id)], item.price);

        const pricing: ItemPricingInput = {
            // Sent only when there is one: the API keeps the stored price when
            // the field is absent, so it can be set but not cleared here.
            ...(price === undefined ? {} : { price }),
            ...(options.length
                ? {
                      variants: options.map((variant) => ({
                          name: variant.name || "",
                          available: variant.available !== false,
                          price: toAmount(
                              drafts[priceKey(item.id, variant.name || "")],
                              variant.price,
                          ),
                      })),
                  }
                : {}),
        };

        try {
            await save({ itemId: item.id, pricing }).unwrap();
            toast({
                tone: "success",
                title: `${item.name || "Item"} priced`,
            });
        } catch (error) {
            toast({
                tone: "error",
                title: "Prices not saved",
                description: getApiErrorMessage(
                    error,
                    "Unable to save these prices.",
                ),
            });
        }
    }

    return (
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:border-primary/30 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground sm:text-base">
                        {item.name || "Unnamed item"}
                    </p>
                    {options.length ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {options.length}{" "}
                            {options.length === 1 ? "option" : "options"}
                        </span>
                    ) : null}
                </div>
                {item.sku ? (
                    <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                        {item.sku}
                    </span>
                ) : null}
            </div>

            <ul className="mt-3 divide-y divide-border/60">
                {rows.map((row) => {
                    const draft = drafts[row.key];
                    const value =
                        draft !== undefined
                            ? draft
                            : row.saved == null
                              ? ""
                              : String(row.saved);

                    return (
                        <li
                            key={row.key}
                            className="flex flex-wrap items-center justify-between gap-3 py-3"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">
                                    {row.base ? "Base price" : row.name}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {row.saved == null
                                        ? "No price set"
                                        : `Saved at ${format(row.saved)}`}
                                    {row.available ? "" : " · Off sale"}
                                </p>
                            </div>

                            {readOnly ? (
                                <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">
                                    {row.saved == null ? "—" : format(row.saved)}
                                </span>
                            ) : (
                                <PriceField
                                    value={value}
                                    label={`${item.name} ${row.base ? "base" : row.name} price`}
                                    onChange={(next) =>
                                        onDraftChange(row.key, next)
                                    }
                                />
                            )}
                        </li>
                    );
                })}
            </ul>

            {readOnly ? null : (
                <div className="mt-3 flex items-center justify-end gap-3 border-t border-border/60 pt-3">
                    {edited ? (
                        <span className="text-xs font-medium text-warning">
                            Unsaved changes
                        </span>
                    ) : null}
                    <Button
                        type="button"
                        size="sm"
                        disabled={!edited || saveState.isLoading}
                        onClick={handleSave}
                        className="gap-2"
                    >
                        {saveState.isLoading ? (
                            <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                            <Check className="size-4" />
                        )}
                        Save prices
                    </Button>
                </div>
            )}
        </div>
    );
}

/**
 * Prices for items and their options, as a section inside the pricing tabs.
 *
 * Inventory creates an item — and any option on it — without a price, which is
 * the whole point of keeping pricing here. Saving writes only the amounts and
 * leaves the rest of the item as it was.
 *
 * `readOnly` is for the channel tab, which shows what things cost but sets its
 * overrides elsewhere.
 */
export function ItemOptionPricing({
    readOnly = false,
}: {
    readOnly?: boolean;
} = {}) {
    const itemsQuery = useGetInventoryItemOptionsQuery();
    const [search, setSearch] = useState("");
    const [drafts, setDrafts] = useState<PriceDraft>({});

    const items = useMemo(() => itemsQuery.data || [], [itemsQuery.data]);

    const visible = items.filter((item) => {
        const query = search.trim().toLowerCase();

        if (!query) return true;

        return [
            item.name,
            item.sku,
            ...(item.variants || []).map((variant) => variant.name),
        ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
    });

    if (itemsQuery.isLoading) {
        return <InventoryLoading label="Loading prices" />;
    }

    if (itemsQuery.error) {
        return (
            <InventoryError
                message={getApiErrorMessage(
                    itemsQuery.error,
                    "Unable to load items.",
                )}
                retry={itemsQuery.refetch}
            />
        );
    }

    // Nothing to price is not worth a block of empty state inside a tab that
    // is already showing prices.
    if (!items.length) {
        return null;
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                        <Tag className="size-4 text-primary" />
                        <span>Item prices</span>
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {readOnly
                            ? "What each item and option costs. Set these on the Set Price tab."
                            : "Items and their options arrive from Inventory unpriced. Set what each one sells for here."}
                    </p>
                </div>

                <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search item or option"
                        className="h-10 rounded-xl pl-9 text-sm"
                    />
                </div>
            </div>

            {visible.length ? (
                <div className="flex flex-col gap-3">
                    {visible.map((item) => (
                        <ItemPricingCard
                            key={item.id}
                            item={item}
                            readOnly={readOnly}
                            drafts={drafts}
                            onDraftChange={(key, value) =>
                                setDrafts((current) => ({
                                    ...current,
                                    [key]: value,
                                }))
                            }
                        />
                    ))}
                </div>
            ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                    Nothing matches that search.
                </p>
            )}
        </div>
    );
}
