import { z } from "zod";

export type BusinessCurrency = {
    id?: string;
    code: string;
    name: string;
    exchangeRate: number;
    symbol: string;
    decimalPlaces: number;
    baseCurrency?: boolean;
    displayCurrency?: boolean;
};

export type BusinessCurrencyConfiguration = {
    baseCurrency: string;
    displayCurrency?: string;
    currencies: BusinessCurrency[];
};

export const businessCurrencySchema = z.object({
    code: z
        .string()
        .trim()
        .length(3, "Use a three-letter currency code.")
        .transform((code) => code.toUpperCase()),
    name: z.string().trim().min(1).max(100),
    symbol: z.string().trim().min(1).max(5),
    exchangeRate: z.coerce
        .number()
        .finite()
        .nonnegative("Exchange rates cannot be negative."),
    decimalPlaces: z.coerce.number().int().min(0).max(3),
});

export const businessCurrencyConfigurationSchema = z
    .object({
        baseCurrency: z
            .string()
            .trim()
            .length(3)
            .transform((code) => code.toUpperCase()),
        currencies: z.array(businessCurrencySchema).min(1),
    })
    .superRefine((configuration, context) => {
        const codes = configuration.currencies.map(
            (currency) => currency.code,
        );

        if (!codes.includes(configuration.baseCurrency)) {
            context.addIssue({
                code: "custom",
                path: ["baseCurrency"],
                message: "The base currency must be in the currency list.",
            });
        }

        if (new Set(codes).size !== codes.length) {
            context.addIssue({
                code: "custom",
                path: ["currencies"],
                message: "Currency codes must be unique.",
            });
        }
    });

export type BusinessCurrencyConfigurationInput = z.infer<
    typeof businessCurrencyConfigurationSchema
>;

export function normalizeCurrencyConfiguration(
    configuration: BusinessCurrencyConfiguration,
): BusinessCurrencyConfiguration {
    const currencies = (configuration.currencies || []).map((currency) => ({
        ...currency,
        code: currency.code.toUpperCase(),
        name: currency.name || currency.code.toUpperCase(),
        symbol: currency.symbol || currency.code.toUpperCase(),
        exchangeRate: Number(currency.exchangeRate),
        decimalPlaces: Number(currency.decimalPlaces),
    }));
    const baseCurrency =
        configuration.baseCurrency?.toUpperCase() ||
        currencies.find((currency) => currency.baseCurrency)?.code ||
        currencies[0]?.code ||
        "";

    return {
        ...configuration,
        baseCurrency,
        displayCurrency:
            configuration.displayCurrency?.toUpperCase() || baseCurrency,
        currencies,
    };
}
