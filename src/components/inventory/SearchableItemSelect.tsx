"use client";

import { useEffect, useRef, useState } from "react";
import {
    Check,
    Package,
    X,
} from "lucide-react";

import { inventoryControlClassName } from "@/components/inventory/InventoryUi";
import { Input } from "@/components/ui/input";
import type { InventoryItem } from "@/lib/api/inventory";
import { cn } from "@/lib/utils";

export function SearchableItemSelect({
    items,
    selectedItemId,
    onSelect,
    stockSummaryMap = {},
    placeholder = "Type product name, SKU, or barcode to search...",
    ariaInvalid,
    className,
}: {
    items: readonly InventoryItem[];
    selectedItemId: string;
    onSelect: (itemId: string) => void;
    stockSummaryMap?: Record<string, number | undefined>;
    placeholder?: string;
    ariaInvalid?: boolean;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedItem = items.find((item) => item.id === selectedItemId);

    // Sync input text when selectedItem changes
    useEffect(() => {
        if (selectedItem) {
            setInputValue(selectedItem.name || "");
        } else if (!open) {
            setInputValue("");
        }
    }, [selectedItemId, selectedItem, open]);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
                if (selectedItem) {
                    setInputValue(selectedItem.name || "");
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [selectedItem]);

    // Filter items based on query input
    const searchQuery = open ? inputValue.trim().toLowerCase() : "";
    const filteredItems = items.filter((item) => {
        if (!searchQuery || (selectedItem && inputValue === selectedItem.name)) return true;
        const nameMatch = (item.name || "").toLowerCase().includes(searchQuery);
        const barcodeMatch = (item.barcode || "").toLowerCase().includes(searchQuery);
        const skuMatch = (item.sku || "").toLowerCase().includes(searchQuery);
        return nameMatch || barcodeMatch || skuMatch;
    });

    function handleClear() {
        onSelect("");
        setInputValue("");
        inputRef.current?.focus();
    }

    return (
        <div ref={containerRef} className={cn("relative w-full", className)}>
            {/* Input Bar without Chevron Dropdown Icon */}
            <div className="relative flex items-center w-full">
                <Input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    aria-invalid={ariaInvalid}
                    onFocus={() => setOpen(true)}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        if (!open) setOpen(true);
                        if (selectedItemId) onSelect("");
                    }}
                    placeholder={placeholder}
                    className={cn(
                        inventoryControlClassName,
                        "pr-9 w-full transition-colors",
                        ariaInvalid && "border-danger ring-danger/20",
                        open && "ring-2 ring-primary/30 border-primary",
                    )}
                />

                {inputValue || selectedItemId ? (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground outline-none transition-colors"
                        title="Clear search"
                    >
                        <X className="size-3.5" />
                    </button>
                ) : null}
            </div>

            {/* Suggestions Dropdown Popover */}
            {open ? (
                <div
                    role="listbox"
                    className="absolute left-0 top-full z-50 mt-1.5 flex w-full flex-col rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl animate-in fade-in-0 zoom-in-95 overflow-hidden"
                >
                    {/* Filtered Results List */}
                    <ul className="max-h-60 overflow-y-auto p-1.5 flex flex-col gap-0.5">
                        {filteredItems.length === 0 ? (
                            <li className="p-4 text-center text-xs text-muted-foreground">
                                No products found matching &quot;{inputValue}&quot;
                            </li>
                        ) : (
                            filteredItems.map((item) => {
                                const isSelected = item.id === selectedItemId;
                                const onHand = stockSummaryMap[item.id];
                                const unit = item.unit?.name || "";

                                return (
                                    <li
                                        key={item.id}
                                        role="option"
                                        aria-selected={isSelected}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                        }}
                                        onClick={() => {
                                            onSelect(item.id);
                                            setInputValue(item.name || "");
                                            setOpen(false);
                                        }}
                                        className={cn(
                                            "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-xs sm:text-sm transition-colors",
                                            isSelected
                                                ? "bg-primary/10 text-primary font-semibold"
                                                : "text-foreground hover:bg-muted/70",
                                        )}
                                    >
                                        <div className="flex min-w-0 flex-col gap-0.5 flex-1">
                                            <div className="flex items-center gap-2">
                                                <Package className={cn("size-3.5 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
                                                <span className="truncate font-medium">
                                                    {item.name || "Unnamed item"}
                                                </span>
                                            </div>

                                            {item.barcode || item.sku ? (
                                                <span className="text-[11px] text-muted-foreground truncate pl-5">
                                                    {item.barcode ? `Barcode: ${item.barcode}` : ""}
                                                    {item.barcode && item.sku ? " • " : ""}
                                                    {item.sku ? `SKU: ${item.sku}` : ""}
                                                </span>
                                            ) : null}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {onHand !== undefined ? (
                                                <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border">
                                                    {onHand} {unit}
                                                </span>
                                            ) : unit ? (
                                                <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border">
                                                    {unit}
                                                </span>
                                            ) : null}

                                            {isSelected ? (
                                                <Check className="size-4 shrink-0 text-primary" />
                                            ) : null}
                                        </div>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>
            ) : null}
        </div>
    );
}
