import {
    useGetBusinessCurrenciesQuery,
    useGetBusinessCurrencyByCodeQuery,
} from "@/services/currencyApi";

/**
 * The symbol to sit against an amount input.
 *
 * Resolves to the business base currency unless a specific code is asked for.
 * Nothing is guessed while the configuration is still in flight: a symbol
 * invented here would sit in front of a field the cashier is typing base
 * currency into, and "$" against riel is worse than no symbol at all.
 */
export function useCurrencySymbol(codeOverride?: string | null) {
    const { data: config, isLoading: isConfigLoading } =
        useGetBusinessCurrenciesQuery();

    const targetCode = (codeOverride || config?.baseCurrency || "")
        .toUpperCase();

    // Method 2 (GET /currencies/{code}): Fetch details for single selected currency
    const {
        data: currency,
        isLoading: isCurrencyLoading,
        error,
    } = useGetBusinessCurrencyByCodeQuery(targetCode, {
        skip: !targetCode,
    });

    const configured =
        currency?.symbol ||
        config?.currencies?.find(
            (c) => c.code.toUpperCase() === targetCode,
        )?.symbol;

    // No configured symbol: let Intl name the currency rather than standing a
    // dollar sign in for one it knows nothing about.
    const symbol = configured || intlSymbol(targetCode);

    return {
        symbol,
        code: targetCode,
        currency,
        config,
        isLoading: isConfigLoading || isCurrencyLoading,
        error,
    };
}

function intlSymbol(code: string): string {
    if (!code) return "";

    try {
        const parts = new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: code,
            currencyDisplay: "narrowSymbol",
        }).formatToParts(0);
        return parts.find((part) => part.type === "currency")?.value ?? code;
    } catch {
        return code;
    }
}
