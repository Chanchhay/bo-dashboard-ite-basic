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

// Map common currency codes to country codes and primary names
const CURRENCY_TO_COUNTRY: Record<string, { country: string; countryCode: string; flagEmoji?: string }> = {
    USD: { country: "United States", countryCode: "us", flagEmoji: "🇺🇸" },
    EUR: { country: "European Union", countryCode: "eu", flagEmoji: "🇪🇺" },
    KHR: { country: "Cambodia", countryCode: "kh", flagEmoji: "🇰🇭" },
    GBP: { country: "United Kingdom", countryCode: "gb", flagEmoji: "🇬🇧" },
    JPY: { country: "Japan", countryCode: "jp", flagEmoji: "🇯🇵" },
    CNY: { country: "China", countryCode: "cn", flagEmoji: "🇨🇳" },
    CNH: { country: "China (Offshore)", countryCode: "cn", flagEmoji: "🇨🇳" },
    THB: { country: "Thailand", countryCode: "th", flagEmoji: "🇹🇭" },
    VND: { country: "Vietnam", countryCode: "vn", flagEmoji: "🇻🇳" },
    SGD: { country: "Singapore", countryCode: "sg", flagEmoji: "🇸🇬" },
    AUD: { country: "Australia", countryCode: "au", flagEmoji: "🇦🇺" },
    CAD: { country: "Canada", countryCode: "ca", flagEmoji: "🇨🇦" },
    CHF: { country: "Switzerland", countryCode: "ch", flagEmoji: "🇨🇭" },
    HKD: { country: "Hong Kong", countryCode: "hk", flagEmoji: "🇭🇰" },
    MYR: { country: "Malaysia", countryCode: "my", flagEmoji: "🇲🇾" },
    IDR: { country: "Indonesia", countryCode: "id", flagEmoji: "🇮🇩" },
    KRW: { country: "South Korea", countryCode: "kr", flagEmoji: "🇰🇷" },
    INR: { country: "India", countryCode: "in", flagEmoji: "🇮🇳" },
    PHP: { country: "Philippines", countryCode: "ph", flagEmoji: "🇵🇭" },
    NZD: { country: "New Zealand", countryCode: "nz", flagEmoji: "🇳🇿" },
    AED: { country: "United Arab Emirates", countryCode: "ae", flagEmoji: "🇦🇪" },
    AFN: { country: "Afghanistan", countryCode: "af", flagEmoji: "🇦🇫" },
    ALL: { country: "Albania", countryCode: "al", flagEmoji: "🇦🇱" },
    AMD: { country: "Armenia", countryCode: "am", flagEmoji: "🇦🇲" },
    ANG: { country: "Curaçao & Sint Maarten", countryCode: "cw", flagEmoji: "🇨🇼" },
    AOA: { country: "Angola", countryCode: "ao", flagEmoji: "🇦🇴" },
    ARS: { country: "Argentina", countryCode: "ar", flagEmoji: "🇦🇷" },
    AWG: { country: "Aruba", countryCode: "aw", flagEmoji: "🇦🇼" },
    AZN: { country: "Azerbaijan", countryCode: "az", flagEmoji: "🇦🇿" },
    BAM: { country: "Bosnia & Herzegovina", countryCode: "ba", flagEmoji: "🇧🇦" },
    BBD: { country: "Barbados", countryCode: "bb", flagEmoji: "🇧🇧" },
    BDT: { country: "Bangladesh", countryCode: "bd", flagEmoji: "🇧🇩" },
    BGN: { country: "Bulgaria", countryCode: "bg", flagEmoji: "🇧🇬" },
    BHD: { country: "Bahrain", countryCode: "bh", flagEmoji: "🇧🇭" },
    BIF: { country: "Burundi", countryCode: "bi", flagEmoji: "🇧🇮" },
    BMD: { country: "Bermuda", countryCode: "bm", flagEmoji: "🇧🇲" },
    BND: { country: "Brunei", countryCode: "bn", flagEmoji: "🇧🇳" },
    BOB: { country: "Bolivia", countryCode: "bo", flagEmoji: "🇧🇴" },
    BRL: { country: "Brazil", countryCode: "br", flagEmoji: "🇧🇷" },
    BSD: { country: "Bahamas", countryCode: "bs", flagEmoji: "🇧🇸" },
    BTN: { country: "Bhutan", countryCode: "bt", flagEmoji: "🇧🇹" },
    BWP: { country: "Botswana", countryCode: "bw", flagEmoji: "🇧🇼" },
    BYN: { country: "Belarus", countryCode: "by", flagEmoji: "🇧🇾" },
    BZD: { country: "Belize", countryCode: "bz", flagEmoji: "🇧🇿" },
    CDF: { country: "Democratic Republic of the Congo", countryCode: "cd", flagEmoji: "🇨🇩" },
    CLP: { country: "Chile", countryCode: "cl", flagEmoji: "🇨🇱" },
    COP: { country: "Colombia", countryCode: "co", flagEmoji: "🇨🇴" },
    CRC: { country: "Costa Rica", countryCode: "cr", flagEmoji: "🇨🇷" },
    CUP: { country: "Cuba", countryCode: "cu", flagEmoji: "🇨🇺" },
    CVE: { country: "Cape Verde", countryCode: "cv", flagEmoji: "🇨🇻" },
    CZK: { country: "Czech Republic", countryCode: "cz", flagEmoji: "🇨🇿" },
    DJF: { country: "Djibouti", countryCode: "dj", flagEmoji: "🇩🇯" },
    DKK: { country: "Denmark", countryCode: "dk", flagEmoji: "🇩🇰" },
    DOP: { country: "Dominican Republic", countryCode: "do", flagEmoji: "🇩🇴" },
    DZD: { country: "Algeria", countryCode: "dz", flagEmoji: "🇩🇿" },
    EGP: { country: "Egypt", countryCode: "eg", flagEmoji: "🇪🇬" },
    ERN: { country: "Eritrea", countryCode: "er", flagEmoji: "🇪🇷" },
    ETB: { country: "Ethiopia", countryCode: "et", flagEmoji: "🇪🇹" },
    FJD: { country: "Fiji", countryCode: "fj", flagEmoji: "🇫🇯" },
    FKP: { country: "Falkland Islands", countryCode: "fk", flagEmoji: "🇫🇰" },
    GEL: { country: "Georgia", countryCode: "ge", flagEmoji: "🇬🇪" },
    GHS: { country: "Ghana", countryCode: "gh", flagEmoji: "🇬🇭" },
    GIP: { country: "Gibraltar", countryCode: "gi", flagEmoji: "🇬🇮" },
    GMD: { country: "Gambia", countryCode: "gm", flagEmoji: "🇬🇲" },
    GNF: { country: "Guinea", countryCode: "gn", flagEmoji: "🇬🇳" },
    GTQ: { country: "Guatemala", countryCode: "gt", flagEmoji: "🇬🇹" },
    GYD: { country: "Guyana", countryCode: "gy", flagEmoji: "🇬🇾" },
    HNL: { country: "Honduras", countryCode: "hn", flagEmoji: "🇭🇳" },
    HRK: { country: "Croatia", countryCode: "hr", flagEmoji: "🇭🇷" },
    HTG: { country: "Haiti", countryCode: "ht", flagEmoji: "🇭🇹" },
    HUF: { country: "Hungary", countryCode: "hu", flagEmoji: "🇭🇺" },
    ILS: { country: "Israel", countryCode: "il", flagEmoji: "🇮🇱" },
    IQD: { country: "Iraq", countryCode: "iq", flagEmoji: "🇮🇶" },
    IRR: { country: "Iran", countryCode: "ir", flagEmoji: "🇮🇷" },
    ISK: { country: "Iceland", countryCode: "is", flagEmoji: "🇮🇸" },
    JMD: { country: "Jamaica", countryCode: "jm", flagEmoji: "🇯🇲" },
    JOD: { country: "Jordan", countryCode: "jo", flagEmoji: "🇯🇴" },
    KES: { country: "Kenya", countryCode: "ke", flagEmoji: "🇰🇪" },
    KGS: { country: "Kyrgyzstan", countryCode: "kg", flagEmoji: "🇰🇬" },
    KMF: { country: "Comoros", countryCode: "km", flagEmoji: "🇰🇲" },
    KPW: { country: "North Korea", countryCode: "kp", flagEmoji: "🇰🇵" },
    KWD: { country: "Kuwait", countryCode: "kw", flagEmoji: "🇰🇼" },
    KYD: { country: "Cayman Islands", countryCode: "ky", flagEmoji: "🇰🇾" },
    KZT: { country: "Kazakhstan", countryCode: "kz", flagEmoji: "🇰🇿" },
    LAK: { country: "Laos", countryCode: "la", flagEmoji: "🇱🇦" },
    LBP: { country: "Lebanon", countryCode: "lb", flagEmoji: "🇱🇧" },
    LKR: { country: "Sri Lanka", countryCode: "lk", flagEmoji: "🇱🇰" },
    LRD: { country: "Liberia", countryCode: "lr", flagEmoji: "🇱🇷" },
    LSL: { country: "Lesotho", countryCode: "ls", flagEmoji: "🇱🇸" },
    LYD: { country: "Libya", countryCode: "ly", flagEmoji: "🇱🇾" },
    MAD: { country: "Morocco", countryCode: "ma", flagEmoji: "🇲🇦" },
    MDL: { country: "Moldova", countryCode: "md", flagEmoji: "🇲🇩" },
    MGA: { country: "Madagascar", countryCode: "mg", flagEmoji: "🇲🇬" },
    MKD: { country: "North Macedonia", countryCode: "mk", flagEmoji: "🇲🇰" },
    MMK: { country: "Myanmar", countryCode: "mm", flagEmoji: "🇲🇲" },
    MNT: { country: "Mongolia", countryCode: "mn", flagEmoji: "🇲🇳" },
    MOP: { country: "Macau", countryCode: "mo", flagEmoji: "🇲🇴" },
    MRU: { country: "Mauritania", countryCode: "mr", flagEmoji: "🇲🇷" },
    MUR: { country: "Mauritius", countryCode: "mu", flagEmoji: "🇲🇺" },
    MVR: { country: "Maldives", countryCode: "mv", flagEmoji: "🇲🇻" },
    MWK: { country: "Malawi", countryCode: "mw", flagEmoji: "🇲🇼" },
    MXN: { country: "Mexico", countryCode: "mx", flagEmoji: "🇲🇽" },
    MZN: { country: "Mozambique", countryCode: "mz", flagEmoji: "🇲🇿" },
    NAD: { country: "Namibia", countryCode: "na", flagEmoji: "🇳🇦" },
    NGN: { country: "Nigeria", countryCode: "ng", flagEmoji: "🇳🇬" },
    NIO: { country: "Nicaragua", countryCode: "ni", flagEmoji: "🇳🇮" },
    NOK: { country: "Norway", countryCode: "no", flagEmoji: "🇳🇴" },
    NPR: { country: "Nepal", countryCode: "np", flagEmoji: "🇳🇵" },
    OMR: { country: "Oman", countryCode: "om", flagEmoji: "🇴🇲" },
    PAB: { country: "Panama", countryCode: "pa", flagEmoji: "🇵🇦" },
    PEN: { country: "Peru", countryCode: "pe", flagEmoji: "🇵🇪" },
    PGK: { country: "Papua New Guinea", countryCode: "pg", flagEmoji: "🇵🇬" },
    PKR: { country: "Pakistan", countryCode: "pk", flagEmoji: "🇵🇰" },
    PLN: { country: "Poland", countryCode: "pl", flagEmoji: "🇵🇱" },
    PYG: { country: "Paraguay", countryCode: "py", flagEmoji: "🇵🇾" },
    QAR: { country: "Qatar", countryCode: "qa", flagEmoji: "🇶🇦" },
    RON: { country: "Romania", countryCode: "ro", flagEmoji: "🇷🇴" },
    RSD: { country: "Serbia", countryCode: "rs", flagEmoji: "🇷🇸" },
    RUB: { country: "Russia", countryCode: "ru", flagEmoji: "🇷🇺" },
    RWF: { country: "Rwanda", countryCode: "rw", flagEmoji: "🇷🇼" },
    SAR: { country: "Saudi Arabia", countryCode: "sa", flagEmoji: "🇸🇦" },
    SCR: { country: "Seychelles", countryCode: "sc", flagEmoji: "🇸🇨" },
    SDG: { country: "Sudan", countryCode: "sd", flagEmoji: "🇸🇩" },
    SEK: { country: "Sweden", countryCode: "se", flagEmoji: "🇸🇪" },
    SOS: { country: "Somalia", countryCode: "so", flagEmoji: "🇸🇴" },
    SRD: { country: "Suriname", countryCode: "sr", flagEmoji: "🇸🇷" },
    SSP: { country: "South Sudan", countryCode: "ss", flagEmoji: "🇸🇸" },
    STN: { country: "São Tomé & Príncipe", countryCode: "st", flagEmoji: "🇸🇹" },
    SVC: { country: "El Salvador", countryCode: "sv", flagEmoji: "🇸🇻" },
    SYP: { country: "Syria", countryCode: "sy", flagEmoji: "🇸🇾" },
    SZL: { country: "Eswatini", countryCode: "sz", flagEmoji: "🇸🇿" },
    TJS: { country: "Tajikistan", countryCode: "tj", flagEmoji: "🇹🇯" },
    TMT: { country: "Turkmenistan", countryCode: "tm", flagEmoji: "🇹🇲" },
    TND: { country: "Tunisia", countryCode: "tn", flagEmoji: "🇹🇳" },
    TOP: { country: "Tonga", countryCode: "to", flagEmoji: "🇹🇴" },
    TRY: { country: "Turkey", countryCode: "tr", flagEmoji: "🇹🇷" },
    TTD: { country: "Trinidad & Tobago", countryCode: "tt", flagEmoji: "🇹🇹" },
    TWD: { country: "Taiwan", countryCode: "tw", flagEmoji: "🇹🇼" },
    TZS: { country: "Tanzania", countryCode: "tz", flagEmoji: "🇹🇿" },
    UAH: { country: "Ukraine", countryCode: "ua", flagEmoji: "🇺🇦" },
    UGX: { country: "Uganda", countryCode: "ug", flagEmoji: "🇺🇬" },
    UYU: { country: "Uruguay", countryCode: "uy", flagEmoji: "🇺🇾" },
    UZS: { country: "Uzbekistan", countryCode: "uz", flagEmoji: "🇺🇿" },
    VES: { country: "Venezuela", countryCode: "ve", flagEmoji: "🇻🇪" },
    VUV: { country: "Vanuatu", countryCode: "vu", flagEmoji: "🇻🇺" },
    WST: { country: "Samoa", countryCode: "ws", flagEmoji: "🇼🇸" },
    XAF: { country: "Central African CFA", countryCode: "cm", flagEmoji: "🇨🇲" },
    XCD: { country: "East Caribbean", countryCode: "ag", flagEmoji: "🇦🇬" },
    XOF: { country: "West African CFA", countryCode: "sn", flagEmoji: "🇸🇳" },
    XPF: { country: "CFP Franc", countryCode: "pf", flagEmoji: "🇵🇫" },
    YER: { country: "Yemen", countryCode: "ye", flagEmoji: "🇾🇪" },
    ZAR: { country: "South Africa", countryCode: "za", flagEmoji: "🇿🇦" },
    ZMW: { country: "Zambia", countryCode: "zm", flagEmoji: "🇿🇲" },
    ZWL: { country: "Zimbabwe", countryCode: "zw", flagEmoji: "🇿🇼" },
};

export function getCurrencyCountryCode(code: string): string {
    const normalized = code.trim().toUpperCase();
    if (CURRENCY_TO_COUNTRY[normalized]) {
        return CURRENCY_TO_COUNTRY[normalized].countryCode;
    }
    const sliced = normalized.slice(0, 2).toLowerCase();
    if (/^[a-z]{2}$/.test(sliced)) {
        return sliced;
    }
    return "un";
}

export function getCurrencyFlagUrl(code: string): string {
    const countryCode = getCurrencyCountryCode(code);
    const baseUrl = (process.env.NEXT_PUBLIC_FLAG_CDN_URL || "https://flagcdn.com").replace(/\/+$/, "");
    return `${baseUrl}/w40/${countryCode}.png`;
}

export function getCurrencyFlag(code: string): string {
    const normalized = code.trim().toUpperCase();
    if (CURRENCY_TO_COUNTRY[normalized]?.flagEmoji) {
        return CURRENCY_TO_COUNTRY[normalized].flagEmoji;
    }
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

    const country = CURRENCY_TO_COUNTRY[normalized]?.country;
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
    const baseUrl = (process.env.NEXT_PUBLIC_CURRENCY_EXCHANGE_API_URL || "https://api.frankfurter.dev").replace(/\/+$/, "");
    const url = `${baseUrl}/v2/rates?base=${encodeURIComponent(base)}`;

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

