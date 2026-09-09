import {
    useGetBusinessCurrenciesQuery,
    useGetBusinessCurrencyByCodeQuery,
} from "@/services/currencyApi";

export function useCurrencySymbol(codeOverride?: string | null) {
    const { data: config, isLoading: isConfigLoading } =
        useGetBusinessCurrenciesQuery();

    const targetCode = (codeOverride || config?.baseCurrency || "")
        .toUpperCase();

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
