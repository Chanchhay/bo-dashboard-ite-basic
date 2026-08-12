"use client";

import { useState } from "react";
import {
    Globe,
    RefreshCw,
    Search,
    Check,
    Plus,
    ArrowRight,
    TrendingUp,
    Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast";
import {
    useGetLiveExchangeRatesQuery,
    useLazyGetLiveExchangeRatesQuery,
} from "@/services/frankfurterApi";
import {
    getCurrencyFlag,
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
    const [calcAmount, setCalcAmount] = useState<number>(100);
    const [calcFrom, setCalcFrom] = useState<string>(baseCurrency || "USD");
    const [calcTo, setCalcTo] = useState<string>(
        configuredCurrencies.find((c) => c.code !== (baseCurrency || "USD"))?.code || "KHR"
    );

    // Fetch live rates via RTK Query
    const { data: liveData, isLoading, isFetching, error, refetch } =
        useGetLiveExchangeRatesQuery(selectedLiveBase);

    const [triggerFetchLive] = useLazyGetLiveExchangeRatesQuery();

    const rates = liveData?.rates || {};
    const rateDate = liveData?.date || "Today";

    const configuredCodes = new Set(configuredCurrencies.map((c) => c.code));

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

    // Handle bulk sync
    async function handleSyncAll() {
        try {
            const res = await triggerFetchLive(baseCurrency).unwrap();
            if (res && res.rates) {
                onSyncAllLiveRates(res.rates, res.date);
                toast({
                    tone: "success",
                    title: "Exchange Rates Updated",
                    description: `Successfully synced configured rates with dynamic live market data (${res.date}).`,
                });
            }
        } catch {
            toast({
                tone: "error",
                title: "Live Rates Sync Failed",
                description: "Could not reach Frankfurter API. Please try again.",
            });
        }
    }

    // Convert calculation using rates
    function calculateConversion() {
        if (!calcAmount || isNaN(calcAmount) || calcAmount <= 0) return 0;
        if (calcFrom === calcTo) return calcAmount;

        // If base rates are from calcFrom or we have EUR/USD standard cross-rate:
        const fromRate = rates[calcFrom] || 1;
        const toRate = rates[calcTo] || 1;

        if (selectedLiveBase === calcFrom) {
            return calcAmount * toRate;
        }

        // Cross rate calculation: (amount / fromRate) * toRate
        const amountInBase = calcAmount / fromRate;
        return amountInBase * toRate;
    }

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

                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void refetch()}
                        disabled={isFetching}
                        className="gap-2"
                    >
                        <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
                        Refresh Rates
                    </Button>

                    <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={handleSyncAll}
                        disabled={isFetching}
                        className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        <TrendingUp className="size-3.5" />
                        Sync All Business Rates
                    </Button>
                </div>
            </div>

            {/* Quick Live Currency Converter */}
            <div className="mt-6 rounded-xl border border-border/80 bg-muted/20 p-4 sm:p-5">
                <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase flex items-center gap-2">
                    <TrendingUp className="size-4 text-primary" /> Live Currency Converter Preview
                </h3>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
                    <div>
                        <Label htmlFor="convert-amount" className="mb-1 block text-xs text-muted-foreground">
                            Amount
                        </Label>
                        <Input
                            id="convert-amount"
                            type="number"
                            min="0"
                            value={calcAmount}
                            onChange={(e) => setCalcAmount(Number(e.target.value))}
                            className="h-10 text-base font-semibold"
                        />
                    </div>

                    <div className="sm:mt-5">
                        <SelectField
                            id="convert-from"
                            value={calcFrom}
                            onValueChange={(val) => val && setCalcFrom(val)}
                            className="h-10 text-sm"
                            options={COMMON_WORLD_CURRENCIES.map((code) => ({
                                value: code,
                                label: `${getCurrencyFlag(code)} ${code}`,
                            }))}
                        />
                    </div>

                    <div className="flex justify-center text-muted-foreground sm:mt-5">
                        <ArrowRight className="size-5" />
                    </div>

                    <div className="sm:mt-5">
                        <SelectField
                            id="convert-to"
                            value={calcTo}
                            onValueChange={(val) => val && setCalcTo(val)}
                            className="h-10 text-sm"
                            options={COMMON_WORLD_CURRENCIES.map((code) => ({
                                value: code,
                                label: `${getCurrencyFlag(code)} ${code}`,
                            }))}
                        />
                    </div>

                    <div className="min-w-0 sm:mt-5">
                        <div className="flex h-10 items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 text-base font-bold text-primary">
                            <span>{getCurrencySymbol(calcTo)}</span>
                            <span className="truncate">
                                {calculateConversion().toLocaleString(undefined, {
                                    maximumFractionDigits: 4,
                                })}
                            </span>
                        </div>
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
                            className="pl-9 h-10 text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Base Currency:</span>
                        <SelectField
                            id="live-base-select"
                            value={selectedLiveBase}
                            onValueChange={(val) => val && setSelectedLiveBase(val)}
                            className="h-10 text-sm min-w-[120px]"
                            options={COMMON_WORLD_CURRENCIES.map((code) => ({
                                value: code,
                                label: `${getCurrencyFlag(code)} ${code}`,
                            }))}
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
                                    const flag = getCurrencyFlag(code);
                                    const symbol = getCurrencySymbol(code);

                                    return (
                                        <div
                                            key={code}
                                            className="flex items-center justify-between p-3.5 transition-colors hover:bg-muted/40"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="text-2xl select-none" role="img" aria-label={name}>
                                                    {flag}
                                                </span>
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

                                                {isConfigured ? (
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => {
                                                            onApplyLiveRate(code, rate);
                                                            toast({
                                                                tone: "success",
                                                                title: "Rate Applied",
                                                                description: `Applied live market rate for ${code}: 1 ${selectedLiveBase} = ${rate}`,
                                                            });
                                                        }}
                                                        className="h-8 text-xs gap-1"
                                                    >
                                                        <RefreshCw className="size-3" />
                                                        Apply Rate
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            onAddAndConfigureCurrency(code, rate);
                                                            toast({
                                                                tone: "success",
                                                                title: "Currency Added",
                                                                description: `Added ${code} to business with live market rate (${rate}).`,
                                                            });
                                                        }}
                                                        className="h-8 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
                                                    >
                                                        <Plus className="size-3" />
                                                        Add to Business
                                                    </Button>
                                                )}
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
