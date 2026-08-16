"use client";

import { useState } from "react";
import {
    Globe,
    RefreshCw,
    Search,
    Check,
    Plus,
    ArrowRight,
    ArrowLeftRight,
    TrendingUp,
} from "lucide-react";

import { CurrencyFlag } from "@/components/ui/currency-flag";
import { SearchableCurrencySelect } from "@/components/ui/searchable-currency-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import {
    useGetLiveExchangeRatesQuery,
    useLazyGetLiveExchangeRatesQuery,
} from "@/services/frankfurterApi";
import {
    getCurrencyNameAndCountry,
    getCurrencySymbol,
} from "@/lib/api/frankfurter";
import type { BusinessCurrency } from "@/lib/api/currency";

interface LiveExchangeRatesSectionProps {
    baseCurrency: string;
    configuredCurrencies: BusinessCurrency[];
    onApplyLiveRate: (code: string, liveRate: number) => void;
    onSyncAllLiveRates: (rates: Record<string, number>, date: string) => void;
    onAddAndConfigureCurrency: (code: string, liveRate: number) => void;
}

const COMMON_WORLD_CURRENCIES = [
    "USD",
    "EUR",
    "KHR",
    "GBP",
    "JPY",
    "CNY",
    "THB",
    "VND",
    "SGD",
    "AUD",
    "CAD",
    "CHF",
    "HKD",
    "MYR",
    "IDR",
    "KRW",
    "INR",
    "PHP",
    "NZD",
    "AED",
    "SAR",
    "BRL",
    "MXN",
];

export default function LiveExchangeRatesSection({
    baseCurrency,
    configuredCurrencies,
    onApplyLiveRate,
    onSyncAllLiveRates,
    onAddAndConfigureCurrency,
}: LiveExchangeRatesSectionProps) {
    const { toast } = useToast();
    const [selectedLiveBase, setSelectedLiveBase] = useState(baseCurrency || "USD");
    const [searchQuery, setSearchQuery] = useState("");

    // Live converter state
    const [calcAmount, setCalcAmount] = useState<number>(1);
    const [calcFrom, setCalcFrom] = useState<string>(baseCurrency || "USD");
    const [calcTo, setCalcTo] = useState<string>(
        configuredCurrencies.find((c) => c.code !== (baseCurrency || "USD"))?.code || "KHR"
    );

    // Fetch live rates via RTK Query with auto real-time polling (every 30 seconds)
    const { data: liveData, isLoading, isFetching, error, refetch } =
        useGetLiveExchangeRatesQuery(selectedLiveBase, {
            pollingInterval: 30000, // Automatically fetch fresh live market rates every 30 seconds
        });

    const rates = liveData?.rates || {};
    const rateDate = liveData?.date || "Today";

    const configuredCodes = new Set(configuredCurrencies.map((c) => c.code));

    // Swap currency direction
    const handleSwapCurrencies = () => {
        setCalcFrom(calcTo);
        setCalcTo(calcFrom);
    };

    // Filter available rate codes
    const availableCodes = Object.keys(rates).sort((a, b) => {
        // Prioritize configured currencies and common currencies
        const aConf = configuredCodes.has(a);
        const bConf = configuredCodes.has(b);
        if (aConf && !bConf) return -1;
        if (!aConf && bConf) return 1;
        return a.localeCompare(b);
    });

    const filteredCodes = availableCodes.filter((code) => {
        if (code === selectedLiveBase) return false;
        const { name, country } = getCurrencyNameAndCountry(code);
        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;
        return (
            code.toLowerCase().includes(query) ||
            name.toLowerCase().includes(query) ||
            (country && country.toLowerCase().includes(query))
        );
    });

    // Convert calculation using rates
    function calculateConversion() {
        if (!calcAmount || isNaN(calcAmount) || calcAmount <= 0) return 0;
        if (calcFrom === calcTo) return calcAmount;

        const fromRate = rates[calcFrom] || 1;
        const toRate = rates[calcTo] || 1;

        if (selectedLiveBase === calcFrom) {
            return calcAmount * toRate;
        }

        // Cross rate calculation: (amount / fromRate) * toRate
        const amountInBase = calcAmount / fromRate;
        return amountInBase * toRate;
    }

    // Unit rate calculation (1 calcFrom = ? calcTo)
    const unitRate = calcFrom === calcTo ? 1 : ((rates[calcTo] || 1) / (rates[calcFrom] || 1));

    return (
        <section className="mt-4 rounded-2xl border border-border bg-card p-6 shadow-[0_4px_10px_rgba(26,34,43,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Globe className="size-4" />
                    </span>
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight text-foreground">
                            Dynamic World Exchange Rates
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Real-time exchange rates from global financial markets ({rateDate})
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary border border-primary/20">
                        <span className="relative flex size-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex size-2 rounded-full bg-primary"></span>
                        </span>
                        Auto Live Feed
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void refetch()}
                        disabled={isFetching}
                        title="Manually refresh live market rates"
                        className="gap-2 text-xs"
                    >
                        <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
                        Refresh Now
                    </Button>
                </div>
            </div>

            {/* Enlarged Interactive Live Currency Converter Preview */}
            <div className="mt-6 rounded-2xl border border-border p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
                    <div>
                        <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <TrendingUp className="size-4" />
                            </span>
                            Live Currency Converter Preview
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            Easily test currency conversions and click swap to switch exchange directions instantly.
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_auto_1fr_1.3fr] items-end">
                    {/* Amount Input */}
                    <div>
                        <Label htmlFor="convert-amount" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                            Amount
                        </Label>
                        <Input
                            id="convert-amount"
                            type="number"
                            min="0"
                            step="any"
                            value={calcAmount || ""}
                            onChange={(e) => setCalcAmount(e.target.value === "" ? 0 : Number(e.target.value))}
                            className="h-12 text-lg font-bold px-3.5 rounded-xl border-border bg-background focus-visible:ring-0 focus-visible:border-primary"
                        />
                    </div>

                    {/* From Currency Selector */}
                    <div>
                        <Label htmlFor="convert-from" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                            From
                        </Label>
                        <SearchableCurrencySelect
                            id="convert-from"
                            value={calcFrom}
                            onValueChange={(val) => setCalcFrom(val)}
                            availableCodes={COMMON_WORLD_CURRENCIES}
                        />
                    </div>

                    {/* Interactive Swap / Switch Exchange Button */}
                    <div className="flex justify-center items-center py-1">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleSwapCurrencies}
                            title="Switch exchange direction"
                            aria-label="Switch exchange direction"
                            className="size-11 rounded-full border-border bg-background hover:bg-primary hover:text-primary-foreground hover:scale-105 transition-all shrink-0"
                        >
                            <ArrowLeftRight className="size-5" />
                        </Button>
                    </div>

                    {/* To Currency Selector */}
                    <div>
                        <Label htmlFor="convert-to" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                            To
                        </Label>
                        <SearchableCurrencySelect
                            id="convert-to"
                            value={calcTo}
                            onValueChange={(val) => setCalcTo(val)}
                            availableCodes={COMMON_WORLD_CURRENCIES}
                        />
                    </div>

                    {/* Converted Output Display Box */}
                    <div className="min-w-0">
                        <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                            Converted Amount
                        </Label>
                        <div className="flex h-12 items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 text-xl font-bold text-primary">
                            <span className="mr-1.5 text-base font-bold opacity-80">{getCurrencySymbol(calcTo)}</span>
                            <span className="truncate tracking-tight">
                                {calculateConversion().toLocaleString(undefined, {
                                    maximumFractionDigits: 4,
                                })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Conversion Rate Formula & Details */}
                <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-2">
                    <div className="flex items-center gap-2">
                        <CurrencyFlag code={calcFrom} size="xs" />
                        <span>1 {calcFrom} =</span>
                        <span className="font-bold font-mono text-foreground">
                            {unitRate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {calcTo}
                        </span>
                        <CurrencyFlag code={calcTo} size="xs" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span>Live Market Rate ({rateDate})</span>
                    </div>
                </div>
            </div>

            {/* Filter & Live Rates Table */}
            <div className="mt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search country or currency (e.g. KHR, EUR, THB)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 text-sm focus-visible:ring-0 focus-visible:border-primary"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Base Currency:</span>
                        <SearchableCurrencySelect
                            id="live-base-select"
                            value={selectedLiveBase}
                            onValueChange={(val) => val && setSelectedLiveBase(val)}
                            availableCodes={COMMON_WORLD_CURRENCIES}
                            className="min-w-[140px]"
                        />
                    </div>
                </div>

                {/* Table list */}
                <div className="mt-4 overflow-hidden rounded-xl border border-border bg-popover/50">
                    <div className="max-h-[380px] overflow-y-auto">
                        {isLoading || isFetching ? (
                            <div className="flex min-h-[200px] items-center justify-center text-muted-foreground gap-2">
                                <RefreshCw className="size-5 animate-spin text-primary" />
                                <span>Fetching live market rates from Frankfurter...</span>
                            </div>
                        ) : error ? (
                            <div className="flex min-h-[160px] flex-col items-center justify-center p-6 text-center text-danger">
                                <p className="font-semibold">Unable to fetch live rates</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Check internet connectivity or retry.
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void refetch()}
                                    className="mt-3"
                                >
                                    Retry
                                </Button>
                            </div>
                        ) : filteredCodes.length === 0 ? (
                            <div className="flex min-h-[160px] items-center justify-center text-sm text-muted-foreground">
                                No currency rates matching &quot;{searchQuery}&quot;
                            </div>
                        ) : (
                            <div className="divide-y divide-border/60">
                                {filteredCodes.map((code) => {
                                    const rate = rates[code];
                                    const isConfigured = configuredCodes.has(code);
                                    const { name, country } = getCurrencyNameAndCountry(code);
                                    const symbol = getCurrencySymbol(code);

                                    return (
                                        <div
                                            key={code}
                                            className="flex items-center justify-between p-3.5 transition-colors hover:bg-muted/40"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <CurrencyFlag code={code} size="lg" className="shadow-xs" />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-foreground">{code}</span>
                                                        <span className="text-xs text-muted-foreground font-mono">
                                                            ({symbol})
                                                        </span>
                                                        {isConfigured && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                                                                <Check className="size-3" /> Configured
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {name} {country ? `• ${country}` : ""}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className="text-right font-mono text-sm font-semibold text-foreground">
                                                    1 {selectedLiveBase} = {rate?.toLocaleString(undefined, { maximumFractionDigits: 6 })} {code}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
