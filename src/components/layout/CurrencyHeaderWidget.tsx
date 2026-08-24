"use client";

import { useState } from "react";
import Link from "next/link";
import { Coins, RefreshCw, ArrowRight, ExternalLink, Sparkles } from "lucide-react";

import {
    Menu,
    MenuContent,
    MenuSeparator,
    MenuTrigger,
} from "@/components/ui/menu";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { useGetLiveExchangeRatesQuery } from "@/services/frankfurterApi";
import { useGetBusinessCurrenciesQuery } from "@/services/currencyApi";
import { CurrencyFlag } from "@/components/ui/currency-flag";
import {
    getCurrencySymbol,
} from "@/lib/api/frankfurter";

export default function CurrencyHeaderWidget() {
    const { data: businessData } = useGetBusinessCurrenciesQuery();
    const baseCurrency = businessData?.baseCurrency || "USD";

    const [calcAmount, setCalcAmount] = useState<number>(100);
    const [targetCode, setTargetCode] = useState<string>("KHR");

    const { data: liveData, isLoading, isFetching, refetch } =
        useGetLiveExchangeRatesQuery(baseCurrency);

    const rates = liveData?.rates || {};
    const rateDate = liveData?.date || "Today";

    const tickerCurrencies = ["KHR", "EUR", "THB", "JPY", "GBP", "VND", "CNY", "SGD"];

    const convertedVal = rates[targetCode]
        ? (calcAmount * rates[targetCode]).toLocaleString(undefined, {
              maximumFractionDigits: 2,
          })
        : "--";

    return (
        <Menu>
            <MenuTrigger
                aria-label="Live Currency Exchange Rates"
                className="flex h-10 items-center gap-1.5 rounded-full border border-border/80 bg-background px-3 text-xs font-semibold text-foreground transition-all hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
            >
                <Coins className="size-4 text-primary shrink-0" />
                <span className="hidden md:inline text-xs font-medium">Currency Rates</span>
                {isFetching && <RefreshCw className="size-3 animate-spin text-primary" />}
            </MenuTrigger>

            <MenuContent align="end" className="w-[340px] p-4 text-foreground">
                <div className="flex items-center justify-between pb-2">
                    <div className="flex items-center gap-2">
                        <Coins className="size-4 text-primary" />
                        <span className="font-bold text-sm">Dynamic Live Rates</span>
                    </div>
                </div>

                <MenuSeparator />

                {/* Quick Convert Tool */}
                <div className="my-3 rounded-lg border border-border/60 bg-muted/30 p-2.5">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-1.5">
                        Quick Live Converter
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
                        <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                                {getCurrencySymbol(baseCurrency)}
                            </span>
                            <Input
                                type="number"
                                min="0"
                                value={calcAmount}
                                onChange={(e) => setCalcAmount(Number(e.target.value))}
                                className="h-8 pl-6 text-xs font-bold"
                            />
                        </div>

                        <ArrowRight className="size-3.5 text-muted-foreground" />

                        <SelectField
                            id="header-widget-target"
                            value={targetCode}
                            onValueChange={(val) => val && setTargetCode(val)}
                            className="h-8 text-xs min-w-[85px]"
                            options={tickerCurrencies.map((code) => ({
                                value: code,
                                label: (
                                    <span className="flex items-center gap-1.5">
                                        <CurrencyFlag code={code} size="xs" />
                                        <span>{code}</span>
                                    </span>
                                ),
                            }))}
                        />
                    </div>

                    <div className="mt-2 flex items-center justify-between rounded bg-popover px-2.5 py-1.5 text-xs">
                        <span className="text-muted-foreground font-medium">Result:</span>
                        <span className="font-bold text-primary font-mono">
                            {getCurrencySymbol(targetCode)} {convertedVal}
                        </span>
                    </div>
                </div>

                {/* Ticker list */}
                <div className="my-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase mb-1.5">
                        <span>Live Rates (1 {baseCurrency})</span>
                        <button
                            type="button"
                            onClick={() => void refetch()}
                            className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                        >
                            <RefreshCw className={`size-2.5 ${isFetching ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="py-4 text-center text-xs text-muted-foreground">Loading rates...</div>
                    ) : (
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                            {tickerCurrencies.map((code) => {
                                const rate = rates[code];
                                return (
                                    <div
                                        key={code}
                                        className="flex items-center justify-between rounded bg-muted/40 px-2 py-1.5 font-mono"
                                    >
                                        <span className="flex items-center gap-1.5 text-[11px]">
                                            <CurrencyFlag code={code} size="xs" />
                                            <span className="font-semibold">{code}</span>
                                        </span>
                                        <span className="text-muted-foreground text-[11px]">
                                            {rate ? rate.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "--"}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <MenuSeparator />

                <Link
                    href="/business/currency"
                    className="mt-2 flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                >
                    <span>Manage Business Currencies</span>
                    <ExternalLink className="size-3.5" />
                </Link>
            </MenuContent>
        </Menu>
    );
}
