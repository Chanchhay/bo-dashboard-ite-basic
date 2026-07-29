"use client";

import { FormEvent, KeyboardEvent, useState } from "react";
import {
    ArrowLeftRight,
    Info,
    LoaderCircle,
    Plus,
    X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import {
    businessCurrencyConfigurationSchema,
    normalizeCurrencyConfiguration,
    type BusinessCurrency,
    type BusinessCurrencyConfiguration,
} from "@/lib/api/currency";
import {
    useGetBusinessCurrenciesQuery,
    useUpdateBusinessCurrenciesMutation,
} from "@/services/currencyApi";

type Status = {
    type: "error" | "success";
    message: string;
};

function getApiErrorMessage(error: unknown, fallback: string) {
    if (
        typeof error === "object" &&
        error !== null &&
        "data" in error &&
        typeof error.data === "object" &&
        error.data !== null &&
        "message" in error.data &&
        typeof error.data.message === "string"
    ) {
        return error.data.message;
    }

    return fallback;
}

function getCurrencyDetails(code: string) {
    const normalizedCode = code.trim().toUpperCase();

    if (!/^[A-Z]{3}$/.test(normalizedCode)) {
        return null;
    }

    try {
        const name =
            new Intl.DisplayNames(["en"], { type: "currency" }).of(
                normalizedCode,
            ) || normalizedCode;
        const symbol =
            new Intl.NumberFormat("en", {
                style: "currency",
                currency: normalizedCode,
                currencyDisplay: "narrowSymbol",
            })
                .formatToParts(0)
                .find((part) => part.type === "currency")?.value ||
            normalizedCode;

        return { code: normalizedCode, name, symbol };
    } catch {
        return null;
    }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3">
            <span className="h-6 w-1.5 rounded-full bg-[#436746]" />
            <h2 className="text-xl leading-5 font-semibold tracking-[0.5px] text-primary uppercase">
                {children}
            </h2>
        </div>
    );
}

function CurrencyEditor({
    initialConfiguration,
}: {
    initialConfiguration: BusinessCurrencyConfiguration;
}) {
    const normalized = normalizeCurrencyConfiguration(
        initialConfiguration,
    );
    const [currencies, setCurrencies] = useState(normalized.currencies);
    const [baseCurrency, setBaseCurrency] = useState(
        normalized.baseCurrency,
    );
    const [selectedTarget, setSelectedTarget] = useState(
        normalized.currencies.find(
            (currency) => currency.code !== normalized.baseCurrency,
        )?.code || "",
    );
    const [newCurrencyCode, setNewCurrencyCode] = useState("");
    const [status, setStatus] = useState<Status | null>(null);
    const [updateCurrencies, updateState] =
        useUpdateBusinessCurrenciesMutation();

    const base =
        currencies.find((currency) => currency.code === baseCurrency) ||
        currencies[0];
    const target =
        currencies.find((currency) => currency.code === selectedTarget) ||
        currencies.find((currency) => currency.code !== baseCurrency);

    function updateCurrency(
        code: string,
        patch: Partial<BusinessCurrency>,
    ) {
        setCurrencies((current) =>
            current.map((currency) =>
                currency.code === code
                    ? { ...currency, ...patch }
                    : currency,
            ),
        );
        setStatus(null);
    }

    function addCurrency() {
        const details = getCurrencyDetails(newCurrencyCode);

        if (!details) {
            setStatus({
                type: "error",
                message: "Enter a valid three-letter currency code.",
            });
            return;
        }

        if (
            currencies.some(
                (currency) => currency.code === details.code,
            )
        ) {
            setStatus({
                type: "error",
                message: `${details.code} is already configured.`,
            });
            return;
        }

        setCurrencies((current) => [
            ...current,
            {
                ...details,
                exchangeRate: 1,
                decimalPlaces: 2,
            },
        ]);
        setSelectedTarget(details.code);
        setNewCurrencyCode("");
        setStatus(null);
    }

    function handleAddKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Enter") {
            event.preventDefault();
            addCurrency();
        }
    }

    function removeCurrency(code: string) {
        if (code === baseCurrency) {
            setStatus({
                type: "error",
                message: "Choose another base currency before removing this one.",
            });
            return;
        }

        const remaining = currencies.filter(
            (currency) => currency.code !== code,
        );
        setCurrencies(remaining);
        if (selectedTarget === code) {
            setSelectedTarget(
                remaining.find(
                    (currency) => currency.code !== baseCurrency,
                )?.code || "",
            );
        }
        setStatus(null);
    }

    function changeBaseCurrency(code: string | null) {
        if (!code) {
            return;
        }

        setBaseCurrency(code);
        if (selectedTarget === code) {
            setSelectedTarget(
                currencies.find((currency) => currency.code !== code)
                    ?.code || "",
            );
        }
        setStatus(null);
    }

    function resetForm() {
        setCurrencies(normalized.currencies);
        setBaseCurrency(normalized.baseCurrency);
        setSelectedTarget(
            normalized.currencies.find(
                (currency) =>
                    currency.code !== normalized.baseCurrency,
            )?.code || "",
        );
        setNewCurrencyCode("");
        setStatus(null);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setStatus(null);

        const result = businessCurrencyConfigurationSchema.safeParse({
            baseCurrency,
            currencies,
        });

        if (!result.success) {
            setStatus({
                type: "error",
                message:
                    result.error.issues[0]?.message ||
                    "Check the currency configuration.",
            });
            return;
        }

        try {
            const updated = await updateCurrencies(result.data).unwrap();
            const next = normalizeCurrencyConfiguration(updated);
            setCurrencies(next.currencies);
            setBaseCurrency(next.baseCurrency);
            setSelectedTarget(
                next.currencies.find(
                    (currency) => currency.code !== next.baseCurrency,
                )?.code || "",
            );
            setStatus({
                type: "success",
                message: "Currency configuration saved successfully.",
            });
        } catch (error) {
            setStatus({
                type: "error",
                message: getApiErrorMessage(
                    error,
                    "Unable to save the currency configuration.",
                ),
            });
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            noValidate
            className="flex min-h-[795px] flex-col"
        >
            <section className="rounded-2xl bg-white p-6 shadow-[0_4px_10px_rgba(26,34,43,0.04)]">
                <SectionTitle>General Configuration</SectionTitle>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                        <Label
                            htmlFor="base-currency"
                            className="mb-3 ml-1 block text-base font-medium text-[#424841]"
                        >
                            Base Currency
                        </Label>
                        <SelectField
                            id="base-currency"
                            value={baseCurrency}
                            onValueChange={changeBaseCurrency}
                            options={currencies.map((currency) => ({
                                value: currency.code,
                                label: `${currency.name} (${currency.code})`,
                            }))}
                        />
                    </div>

                    <div>
                        <Label
                            htmlFor="decimal-places"
                            className="mb-3 ml-1 block text-base font-medium text-[#424841]"
                        >
                            Decimal Places
                        </Label>
                        <SelectField
                            id="decimal-places"
                            value={String(base?.decimalPlaces ?? 2)}
                            onValueChange={(value) => {
                                if (value && base) {
                                    updateCurrency(base.code, {
                                        decimalPlaces: Number(value),
                                    });
                                }
                            }}
                            options={[
                                { value: "0", label: "0" },
                                { value: "1", label: "1" },
                                { value: "2", label: "2 (Standard)" },
                                { value: "3", label: "3" },
                            ]}
                        />
                    </div>
                </div>

                <div className="mt-7">
                    <Label
                        htmlFor="add-currency"
                        className="mb-3 ml-1 block text-base font-medium text-[#424841]"
                    >
                        Currencies
                    </Label>
                    <div className="flex min-h-[56px] flex-wrap items-center gap-2 rounded-xl border border-[#e8e8e8] bg-white p-2">
                        {currencies.map((currency) => {
                            const isSelected =
                                currency.code === selectedTarget;
                            return (
                                <div
                                    key={currency.code}
                                    className={`flex h-[38px] items-center gap-2 rounded-full px-3 text-sm font-medium tracking-[0.14px] text-[#2b4e30] outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                        isSelected
                                            ? "bg-[#aee0b1] ring-1 ring-primary/25"
                                            : "bg-[#c4edc4]"
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (
                                                currency.code !==
                                                baseCurrency
                                            ) {
                                                setSelectedTarget(
                                                    currency.code,
                                                );
                                            }
                                        }}
                                        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    >
                                        {currency.code}
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={`Remove ${currency.code}`}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            removeCurrency(
                                                currency.code,
                                            );
                                        }}
                                        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    >
                                        <X className="size-3" />
                                    </button>
                                </div>
                            );
                        })}
                        <Input
                            id="add-currency"
                            value={newCurrencyCode}
                            onChange={(event) =>
                                setNewCurrencyCode(
                                    event.target.value
                                        .toUpperCase()
                                        .slice(0, 3),
                                )
                            }
                            onKeyDown={handleAddKeyDown}
                            placeholder="Add currency..."
                            aria-label="Three-letter currency code"
                            className="h-[38px] min-w-[150px] flex-1 rounded-lg border-0 bg-transparent px-3 text-base shadow-none focus-visible:ring-0"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={addCurrency}
                            aria-label="Add currency"
                        >
                            <Plus className="size-5" />
                        </Button>
                    </div>
                </div>
            </section>

            <section className="mt-4 rounded-2xl bg-white p-6 shadow-[0_4px_10px_rgba(26,34,43,0.04)]">
                <SectionTitle>Exchange Rate &amp; Calculator</SectionTitle>

                <div className="mt-5 max-w-[630px] rounded-2xl border border-[#f5f5f5] p-4 sm:p-6">
                    {base && target ? (
                        <>
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                                <div className="w-full sm:w-[150px]">
                                    <p className="mb-3 text-lg font-semibold text-[#020409]/70">
                                        1 {base.code} Equals
                                    </p>
                                    <div className="flex h-[54px] items-center gap-3 rounded-xl border border-[rgba(194,200,190,0.3)] px-3">
                                        <span className="text-base font-bold text-[#436746]">
                                            {base.symbol}
                                        </span>
                                        <span className="text-2xl font-bold text-[#1a1c19]">
                                            1
                                        </span>
                                    </div>
                                </div>

                                <span className="mb-2 flex size-8 shrink-0 items-center justify-center self-center rounded-full bg-[#f6e2a1] text-[#826b14] sm:self-auto">
                                    <ArrowLeftRight className="size-4" />
                                </span>

                                <div className="w-full sm:w-[210px]">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <Label
                                            htmlFor="exchange-value"
                                            className="text-lg font-semibold text-[#020409]/70"
                                        >
                                            Exchange Value
                                        </Label>
                                        <SelectField
                                            id="exchange-value"
                                            value={target.code}
                                            onValueChange={setSelectedTarget}
                                            /* Sits inline beside its label, so
                                               it keeps a compact trigger. */
                                            className="h-9 w-auto rounded-lg px-3 text-sm"
                                            options={currencies
                                                .filter(
                                                    (currency) =>
                                                        currency.code !==
                                                        baseCurrency,
                                                )
                                                .map((currency) => ({
                                                    value: currency.code,
                                                    label: currency.code,
                                                }))}
                                        />
                                    </div>
                                    <div className="flex h-[54px] items-center gap-1 rounded-xl px-3 shadow-[0_0_0_2px_rgba(67,103,70,0.05)]">
                                        <span className="text-base font-bold text-[#436746]">
                                            {target.symbol}
                                        </span>
                                        <Input
                                            id="exchange-value"
                                            type="number"
                                            min="0"
                                            step="any"
                                            value={target.exchangeRate}
                                            onChange={(event) =>
                                                updateCurrency(
                                                    target.code,
                                                    {
                                                        exchangeRate: Number(
                                                            event.target
                                                                .value,
                                                        ),
                                                    },
                                                )
                                            }
                                            className="h-12 rounded-none border-0 bg-transparent px-3 text-2xl font-bold text-[#1a1c19] shadow-none focus-visible:ring-0"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex gap-4 rounded-xl border border-[rgba(171,168,186,0.2)] bg-[#f5f5f5] p-4 text-sm leading-[22px] text-[#424841]">
                                <Info className="mt-0.5 size-5 shrink-0 text-[#636b74]" />
                                <p>
                                    Automated exchange rates sync every 4
                                    hours from the central bank. Manual
                                    overrides will lock the rate for 24 hours.
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="flex min-h-36 items-center justify-center rounded-xl bg-[#f8f9f8] px-6 text-center text-sm text-[#636b74]">
                            Add a second currency to configure an exchange
                            rate.
                        </div>
                    )}
                </div>
            </section>

            <div className="mt-auto flex flex-wrap items-center justify-end gap-3 pt-6">
                {status ? (
                    <p
                        role={status.type === "error" ? "alert" : "status"}
                        className={`mr-auto text-sm font-medium ${
                            status.type === "error"
                                ? "text-accent"
                                : "text-primary"
                        }`}
                    >
                        {status.message}
                    </p>
                ) : null}
                <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    disabled={updateState.isLoading}
                    size="lg"
                        className="min-w-[124px]"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={updateState.isLoading}
                    size="lg"
                        className="min-w-[124px]"
                >
                    {updateState.isLoading ? (
                        <>
                            <LoaderCircle className="animate-spin" />
                            Saving…
                        </>
                    ) : (
                        "Save"
                    )}
                </Button>
            </div>
        </form>
    );
}

function CurrencyQueryError({
    message,
    onRetry,
}: {
    message: string;
    onRetry: () => void;
}) {
    return (
        <div
            role="alert"
            className="rounded-2xl border border-accent/20 bg-white p-6 shadow-[0_4px_10px_rgba(26,34,43,0.04)]"
        >
            <h2 className="text-lg font-bold text-[#161d16]">
                Unable to load currencies
            </h2>
            <p className="mt-2 text-sm text-[#636b74]">{message}</p>
            <Button
                type="button"
                onClick={onRetry}
                className="mt-5"
            >
                Try again
            </Button>
        </div>
    );
}

export default function BusinessCurrencyForm() {
    const query = useGetBusinessCurrenciesQuery();

    if (query.isLoading) {
        return (
            <div
                aria-label="Loading currency configuration"
                className="min-h-[795px] animate-pulse rounded-2xl bg-[#f7f8f7]"
            />
        );
    }

    if (query.error || !query.data) {
        return (
            <CurrencyQueryError
                message={getApiErrorMessage(
                    query.error,
                    "The business currency API could not be reached.",
                )}
                onRetry={() => void query.refetch()}
            />
        );
    }

    const configuration = normalizeCurrencyConfiguration(query.data);
    const editorKey = [
        configuration.baseCurrency,
        configuration.displayCurrency,
        ...configuration.currencies.flatMap((currency) => [
            currency.code,
            currency.name,
            currency.symbol,
            currency.exchangeRate,
            currency.decimalPlaces,
        ]),
    ].join("|");

    return (
        <CurrencyEditor
            key={editorKey}
            initialConfiguration={configuration}
        />
    );
}
