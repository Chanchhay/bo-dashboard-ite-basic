export interface FrankfurterRateItem {
    date: string;
    base: string;
    quote: string;
    rate: number;
}

export interface CurrencyMetadata {
    code: string;
    name: string;
    symbol: string;
    flag: string;
}

// Map common currency codes to country flags and primary names
const CURRENCY_METADATA: Record<string, { flag: string; country: string }> = {
    USD: { flag: "🇺🇸", country: "United States" },
    EUR: { flag: "🇪🇺", country: "European Union" },
    KHR: { flag: "🇰🇭", country: "Cambodia" },
    GBP: { flag: "🇬🇧", country: "United Kingdom" },
    JPY: { flag: "🇯🇵", country: "Japan" },
    CNY: { flag: "🇨🇳", country: "China" },
    CNH: { flag: "🇨🇳", country: "China (Offshore)" },
    THB: { flag: "🇹🇭", country: "Thailand" },
    VND: { flag: "🇻🇳", country: "Vietnam" },
    SGD: { flag: "🇸🇬", country: "Singapore" },
    AUD: { flag: "🇦🇺", country: "Australia" },
    CAD: { flag: "🇨🇦", country: "Canada" },
    CHF: { flag: "🇨🇭", country: "Switzerland" },
    HKD: { flag: "🇭🇰", country: "Hong Kong" },
    MYR: { flag: "🇲🇾", country: "Malaysia" },
    IDR: { flag: "🇮🇩", country: "Indonesia" },
    KRW: { flag: "🇰🇷", country: "South Korea" },
    INR: { flag: "🇮🇳", country: "India" },
    PHP: { flag: "🇵🇭", country: "Philippines" },
    NZD: { flag: "🇳🇿", country: "New Zealand" },
    AED: { flag: "🇦🇪", country: "United Arab Emirates" },
    SAR: { flag: "🇸🇦", country: "Saudi Arabia" },
    QAR: { flag: "🇶🇦", country: "Qatar" },
    BRL: { flag: "🇧🇷", country: "Brazil" },
    MXN: { flag: "🇲🇽", country: "Mexico" },
    RUB: { flag: "🇷🇺", country: "Russia" },
    ZAR: { flag: "🇿🇦", country: "South Africa" },
    TRY: { flag: "🇹🇷", country: "Turkey" },
    TWD: { flag: "🇹🇼", country: "Taiwan" },
    SEK: { flag: "🇸🇪", country: "Sweden" },
    NOK: { flag: "🇳🇴", country: "Norway" },
    DKK: { flag: "🇩🇰", country: "Denmark" },
    PLN: { flag: "🇵🇱", country: "Poland" },
    EGP: { flag: "🇪🇬", country: "Egypt" },
    PKR: { flag: "🇵🇰", country: "Pakistan" },
    BDT: { flag: "🇧🇩", country: "Bangladesh" },
    LAK: { flag: "🇱🇦", country: "Laos" },
    MMK: { flag: "🇲🇲", country: "Myanmar" },
};

export function getCurrencyFlag(code: string): string {
    const normalized = code.trim().toUpperCase();
    if (CURRENCY_METADATA[normalized]) {
        return CURRENCY_METADATA[normalized].flag;
    }
    // Fallback flag based on regional code prefix
    return "🌐";
}

export function getCurrencyNameAndCountry(code: string): { name: string; country?: string } {
    const normalized = code.trim().toUpperCase();
    let name = normalized;
    try {
        name = new Intl.DisplayNames(["en"], { type: "currency" }).of(normalized) || normalized;
    } catch {
        name = normalized;
    }

    const country = CURRENCY_METADATA[normalized]?.country;
    return { name, country };
}

export function getCurrencySymbol(code: string): string {
    const normalized = code.trim().toUpperCase();
    try {
        return (
            new Intl.NumberFormat("en", {
                style: "currency",
                currency: normalized,
                currencyDisplay: "narrowSymbol",
            })
                .formatToParts(0)
                .find((part) => part.type === "currency")?.value || normalized
        );
    } catch {
        return normalized;
    }
}

export async function fetchFrankfurterRates(baseCurrency: string = "USD"): Promise<{
    date: string;
    base: string;
    rates: Record<string, number>;
}> {
    const base = baseCurrency.toUpperCase();
    const url = `https://api.frankfurter.dev/v2/rates?base=${encodeURIComponent(base)}`;

    const response = await fetch(url, {
        headers: {
            Accept: "application/json",
        },
        next: { revalidate: 3600 }, // cache for 1 hour on server if SSR/RSC
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch rates from Frankfurter API (${response.status})`);
    }

    const data: FrankfurterRateItem[] = await response.json();

    const rates: Record<string, number> = {};
    let date = new Date().toISOString().split("T")[0];

    if (Array.isArray(data)) {
        for (const item of data) {
            if (item.quote) {
                rates[item.quote.toUpperCase()] = item.rate;
            }
            if (item.date) {
                date = item.date;
            }
        }
    }

    // Always include base currency itself at rate 1.0
    rates[base] = 1.0;

    return {
        date,
        base,
        rates,
    };
}
