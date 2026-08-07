import {
    useGetBusinessCurrenciesQuery,
    useGetBusinessCurrencyByCodeQuery,
} from "@/services/currencyApi";

export function useCurrencySymbol(codeOverride?: string) {
    const { data: config, isLoading: isConfigLoading } =
        useGetBusinessCurrenciesQuery();

    const targetCode = (
        codeOverride ||
        config?.baseCurrency ||
        "USD"
    ).toUpperCase();

    // Method 2 (GET /currencies/{code}): Fetch details for single selected currency
    const {
        data: currency,
        isLoading: isCurrencyLoading,
        error,
    } = useGetBusinessCurrencyByCodeQuery(targetCode, {
        skip: !targetCode,
    });

    const symbol =
        currency?.symbol ||
        config?.currencies?.find(
            (c) => c.code.toUpperCase() === targetCode,
        )?.symbol ||
        (targetCode === "KHR" ? "៛" : "$");

    return {
        symbol,
        code: targetCode,
        currency,
        config,
        isLoading: isConfigLoading || isCurrencyLoading,
        error,
    };
}
