"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Package, Plus, X } from "lucide-react";

import { inventoryControlClassName } from "@/components/inventory/InventoryUi";
import { Input } from "@/components/ui/input";
import type { AddOn, InventoryItem } from "@/lib/api/inventory";
import { cn } from "@/lib/utils";

/** What a stock movement can be recorded against. */
export type StockTargetKind = "ITEM" | "ADDON";

export type StockTargetOption = {
    kind: StockTargetKind;
    id: string;
    name: string;
    /** SKU and barcode for an item; how much one selection uses for an add-on. */
    hint?: string;
    unitLabel?: string;
    onHand?: number;
};

export type StockTargetRef = {
    kind: StockTargetKind;
    id: string;
};

const sections: { kind: StockTargetKind; label: string; hint: string }[] = [
    { kind: "ITEM", label: "Items", hint: "Sold on their own" },
    { kind: "ADDON", label: "Add-ons", hint: "Only sold with an item" },
];

/** Builds the option list both stock forms and the stock overview share. */
export function toStockTargets(
    items: readonly InventoryItem[],
    addOns: readonly AddOn[],
    onHandById: Record<string, number | undefined> = {},
): StockTargetOption[] {
    return [
        ...items
            .filter((item) => item.trackInventory !== false)
            .map((item) => ({
                kind: "ITEM" as const,
                id: item.id,
                name: item.name || "Unnamed item",
                hint: [
                    item.barcode ? `Barcode: ${item.barcode}` : "",
                    item.sku ? `SKU: ${item.sku}` : "",
                ]
                    .filter(Boolean)
                    .join(" • "),
                unitLabel: item.unit?.name || "",
                onHand: onHandById[item.id],
            })),
        ...addOns.map((addOn) => ({
            kind: "ADDON" as const,
            id: addOn.id,
            name: addOn.name || "Unnamed add-on",
            hint: addOn.baseUnit?.name
                ? `Counted in ${addOn.baseUnit.name}`
                : "No unit set",
            unitLabel: addOn.baseUnit?.name || "",
            onHand: onHandById[addOn.id],
        })),
    ];
}

/**
 * One dropdown for everything stock can be counted against.
 *
 * Items and add-ons are stocked the same way and are searched together, but
 * they are not the same thing — an add-on is never sold on its own — so they
 * are kept in labelled sections rather than mixed into one list where
 * "Pearls" and "Pearl Milk Tea" would sit side by side.
 */
export function StockTargetSelect({
    targets,
    selected,
    onSelect,
    placeholder = "Search items and add-ons by name, SKU or barcode...",
    ariaInvalid,
    className,
}: {
    targets: readonly StockTargetOption[];
    selected: StockTargetRef | null;
    onSelect: (target: StockTargetRef | null) => void;
    placeholder?: string;
    ariaInvalid?: boolean;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedTarget = targets.find(
        (target) =>
            selected != null &&
            target.kind === selected.kind &&
            target.id === selected.id,
    );

    // Closed, the field reads back what is chosen; open, it is a search box.
    const inputValue = open ? query : (selectedTarget?.name ?? "");

    useEffect(() => {
        if (!open) return;

        function handleClickOutside(event: MouseEvent) {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    const grouped = useMemo(() => {
        const search = query.trim().toLowerCase();
        const matching = search
            ? targets.filter((target) =>
                  `${target.name} ${target.hint || ""}`
                      .toLowerCase()
                      .includes(search),
              )
            : targets;

        return sections
            .map((section) => ({
                ...section,
                options: matching.filter(
                    (target) => target.kind === section.kind,
                ),
            }))
            .filter((section) => section.options.length > 0);
    }, [targets, query]);

    function choose(target: StockTargetOption) {
        onSelect({ kind: target.kind, id: target.id });
        setQuery("");
        setOpen(false);
    }

    return (
        <div ref={containerRef} className={cn("relative w-full", className)}>
            <div className="relative flex w-full items-center">
                <Input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    aria-invalid={ariaInvalid}
                    aria-expanded={open}
                    role="combobox"
                    onFocus={() => setOpen(true)}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setOpen(true);
                    }}
                    placeholder={placeholder}
                    className={cn(
                        inventoryControlClassName,
                        "w-full pr-9 transition-colors",
                        ariaInvalid && "border-danger ring-danger/20",
                        open && "border-primary ring-2 ring-primary/30",
                    )}
                />

                {inputValue ? (
                    <button
                        type="button"
                        onClick={() => {
                            onSelect(null);
                            setQuery("");
                            inputRef.current?.focus();
                        }}
                        title="Clear"
                        className="absolute right-3 rounded-md p-1 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <X className="size-3.5" />
                    </button>
                ) : null}
            </div>

            {open ? (
                <div className="animate-in fade-in-0 zoom-in-95 absolute top-full left-0 z-50 mt-1.5 flex w-full flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl">
                    <ul
                        role="listbox"
                        className="flex max-h-72 flex-col gap-0.5 overflow-y-auto p-1.5"
                    >
                        {grouped.length === 0 ? (
                            <li className="p-4 text-center text-xs text-muted-foreground">
                                Nothing matches &quot;{query}&quot;
                            </li>
                        ) : (
                            grouped.map((section) => (
                                <li key={section.kind}>
                                    <p className="flex items-baseline gap-2 px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        {section.label}
                                        <span className="text-[10px] font-normal normal-case">
                                            {section.hint}
                                        </span>
                                    </p>
                                    <ul className="flex flex-col gap-0.5">
                                        {section.options.map((target) => {
                                            const isSelected =
                                                selectedTarget?.kind ===
                                                    target.kind &&
                                                selectedTarget?.id === target.id;
                                            const Icon =
                                                target.kind === "ITEM"
                                                    ? Package
                                                    : Plus;

                                            return (
                                                <li
                                                    key={`${target.kind}:${target.id}`}
                                                    role="option"
                                                    aria-selected={isSelected}
                                                    onMouseDown={(event) =>
                                                        event.preventDefault()
                                                    }
                                                    onClick={() => choose(target)}
                                                    className={cn(
                                                        "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-xs transition-colors sm:text-sm",
                                                        isSelected
                                                            ? "bg-primary/10 font-semibold text-primary"
                                                            : "text-foreground hover:bg-muted/70",
                                                    )}
                                                >
                                                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <Icon
                                                                className={cn(
                                                                    "size-3.5 shrink-0",
                                                                    isSelected
                                                                        ? "text-primary"
                                                                        : "text-muted-foreground",
                                                                )}
                                                            />
                                                            <span className="truncate font-medium">
                                                                {target.name}
                                                            </span>
                                                        </div>
                                                        {target.hint ? (
                                                            <span className="truncate pl-5 text-[11px] text-muted-foreground">
                                                                {target.hint}
                                                            </span>
                                                        ) : null}
                                                    </div>

                                                    <div className="flex shrink-0 items-center gap-2">
                                                        {target.onHand !==
                                                        undefined ? (
                                                            <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                                {target.onHand}{" "}
                                                                {target.unitLabel}
                                                            </span>
                                                        ) : target.unitLabel ? (
                                                            <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                                {target.unitLabel}
                                                            </span>
                                                        ) : null}
                                                        {isSelected ? (
                                                            <Check className="size-4 shrink-0 text-primary" />
                                                        ) : null}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            ) : null}
        </div>
    );
}
