"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { CurrencyFlag } from "@/components/ui/currency-flag";
import { getCurrencyNameAndCountry, getCurrencySymbol } from "@/lib/api/frankfurter";
import { cn } from "@/lib/utils";

const DEFAULT_CURRENCY_CODES = [
    "USD", "EUR", "KHR", "GBP", "JPY", "CNY", "THB", "VND", "SGD", "AUD",
    "CAD", "CHF", "HKD", "MYR", "IDR", "KRW", "INR", "PHP", "NZD", "AED",
    "SAR", "BRL", "MXN", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AWG",
    "AZN", "BAM", "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB",
    "BSD", "BTN", "BWP", "BYN", "BZD", "CDF", "CLP", "COP", "CRC", "CUP",
    "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", "EGP", "ERN", "ETB", "FJD",
    "GEL", "GHS", "GIP", "GMD", "GNF", "GTQ", "GYD", "HNL", "HRK", "HTG",
    "HUF", "ILS", "IQD", "IRR", "ISK", "JMD", "JOD", "KES", "KGS", "KMF",
    "KWD", "KYD", "KZT", "LAK", "LBP", "LKR", "LRD", "LSL", "LYD", "MAD",
    "MDL", "MGA", "MKD", "MMK", "MNT", "MOP", "MRU", "MUR", "MVR", "MWK",
    "MZN", "NAD", "NGN", "NIO", "NOK", "NPR", "OMR", "PAB", "PEN", "PGK",
    "PKR", "PLN", "PYG", "QAR", "RON", "RSD", "RUB", "RWF", "SCR", "SDG",
    "SEK", "SOS", "SRD", "SSP", "STN", "SVC", "SYP", "SZL", "TJS", "TMT",
    "TND", "TOP", "TRY", "TTD", "TWD", "TZS", "UAH", "UGX", "UYU", "UZS",
    "VES", "VUV", "WST", "YER", "ZAR", "ZMW", "ZWL"
];

export function SearchableCurrencySelect({
    id,
    value,
    onValueChange,
    availableCodes = DEFAULT_CURRENCY_CODES,
    className,
    disabled = false,
}: {
    id?: string;
    value: string;
    onValueChange: (code: string) => void;
    availableCodes?: string[];
    className?: string;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const activeCode = value ? value.toUpperCase() : "USD";
    const { name: activeName } = getCurrencyNameAndCountry(activeCode);

    // Focus search input when popover opens
    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        } else {
            setSearchQuery("");
        }
    }, [open]);

    // Close popover on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Filter currencies based on search query
    const filteredCodes = availableCodes.filter((code) => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        const { name, country } = getCurrencyNameAndCountry(code);
        return (
            code.toLowerCase().includes(q) ||
            name.toLowerCase().includes(q) ||
            (country && country.toLowerCase().includes(q))
        );
    });

    return (
        <div ref={containerRef} className={cn("relative w-full", className)}>
            {/* Trigger Button */}
            <button
                id={id}
                type="button"
                disabled={disabled}
                onClick={() => setOpen((prev) => !prev)}
                className={cn(
                    "flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-border bg-popover px-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent/50 outline-none focus-visible:ring-0 focus-visible:border-primary",
                    open && "border-primary",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
            >
                <span className="flex items-center gap-2 min-w-0 truncate">
                    <CurrencyFlag code={activeCode} size="md" />
                    <span className="font-bold text-foreground">{activeCode}</span>
                    <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                        • {activeName}
                    </span>
                </span>
                <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
            </button>

            {/* Suggestions Popover */}
            {open && (
                <div className="absolute left-0 top-full z-50 mt-1.5 flex w-full min-w-[260px] flex-col rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl animate-in fade-in-0 zoom-in-95 overflow-hidden">
                    {/* Search Input Header */}
                    <div className="relative flex items-center border-b border-border/80 p-2 bg-muted/30">
                        <Search className="absolute left-4 size-4 text-muted-foreground" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search currency or country..."
                            className="h-9 w-full rounded-lg bg-background pl-8 pr-8 text-xs font-medium text-foreground outline-none placeholder:text-muted-foreground border border-border focus:border-primary focus:ring-0"
                        />
                        {searchQuery ? (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-4 text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-3.5" />
                            </button>
                        ) : null}
                    </div>

                    {/* Suggestions List */}
                    <ul className="max-h-64 overflow-y-auto p-1.5 flex flex-col gap-0.5">
                        {filteredCodes.length === 0 ? (
                            <li className="p-4 text-center text-xs text-muted-foreground">
                                No currency matching &quot;{searchQuery}&quot;
                            </li>
                        ) : (
                            filteredCodes.map((code) => {
                                const isSelected = code === activeCode;
                                const { name, country } = getCurrencyNameAndCountry(code);
                                const symbol = getCurrencySymbol(code);

                                return (
                                    <li
                                        key={code}
                                        role="option"
                                        aria-selected={isSelected}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            onValueChange(code);
                                            setOpen(false);
                                        }}
                                        className={cn(
                                            "flex cursor-pointer items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-xs sm:text-sm transition-colors",
                                            isSelected
                                                ? "bg-primary/10 text-primary font-semibold"
                                                : "text-foreground hover:bg-muted/70"
                                        )}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0 truncate">
                                            <CurrencyFlag code={code} size="sm" />
                                            <span className="font-bold">{code}</span>
                                            <span className="text-xs text-muted-foreground truncate">
                                                ({symbol}) {name} {country ? `• ${country}` : ""}
                                            </span>
                                        </div>

                                        {isSelected && (
                                            <Check className="size-4 shrink-0 text-primary" />
                                        )}
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
