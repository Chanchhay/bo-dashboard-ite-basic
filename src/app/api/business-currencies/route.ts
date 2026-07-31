import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import type { Business } from "@/lib/api/business";
import {
    businessCurrencyConfigurationSchema,
    normalizeCurrencyConfiguration,
    type BusinessCurrency,
    type BusinessCurrencyConfiguration,
} from "@/lib/api/currency";

function currencyPath(businessId: string, code?: string) {
    const basePath = `/api/v1/businesses/${encodeURIComponent(businessId)}/currencies`;
    return code
        ? `${basePath}/${encodeURIComponent(code)}`
        : basePath;
}

async function getBusinessId() {
    const business = await backendRequest<Business>(
        "/api/v1/businesses/me",
    );
    return business.id;
}

export async function GET() {
    try {
        const businessId = await getBusinessId();
        const configuration =
            await backendRequest<BusinessCurrencyConfiguration>(
                currencyPath(businessId),
            );

        return Response.json(
            normalizeCurrencyConfiguration(configuration),
        );
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function PUT(request: Request) {
    try {
        const result = businessCurrencyConfigurationSchema.safeParse(
            await request.json(),
        );

        if (!result.success) {
            return Response.json(
                { message: "Check the submitted currency configuration." },
                { status: 400 },
            );
        }

        const businessId = await getBusinessId();
        const current = normalizeCurrencyConfiguration(
            await backendRequest<BusinessCurrencyConfiguration>(
                currencyPath(businessId),
            ),
        );
        const currentByCode = new Map(
            current.currencies.map((currency) => [
                currency.code,
                currency,
            ]),
        );
        const desiredCodes = new Set(
            result.data.currencies.map((currency) => currency.code),
        );

        for (const currency of result.data.currencies) {
            const payload: Omit<
                BusinessCurrency,
                "id" | "baseCurrency" | "displayCurrency"
            > = {
                code: currency.code,
                name: currency.name,
                symbol: currency.symbol,
                exchangeRate: currency.exchangeRate,
                decimalPlaces: currency.decimalPlaces,
            };

            if (currentByCode.has(currency.code)) {
                const { code: _code, ...updatePayload } = payload;
                void _code;
                await backendRequest<BusinessCurrencyConfiguration>(
                    currencyPath(businessId, currency.code),
                    {
                        method: "PUT",
                        body: JSON.stringify(updatePayload),
                    },
                );
            } else {
                await backendRequest<BusinessCurrencyConfiguration>(
                    currencyPath(businessId),
                    {
                        method: "POST",
                        body: JSON.stringify(payload),
                    },
                );
            }
        }

        if (current.baseCurrency !== result.data.baseCurrency) {
            await backendRequest<BusinessCurrencyConfiguration>(
                `${currencyPath(businessId, result.data.baseCurrency)}/base`,
                { method: "PUT" },
            );
        }

        const displayCurrency = desiredCodes.has(
            current.displayCurrency || "",
        )
            ? current.displayCurrency
            : result.data.baseCurrency;

        if (displayCurrency !== current.displayCurrency) {
            await backendRequest<BusinessCurrencyConfiguration>(
                `${currencyPath(businessId, displayCurrency)}/display`,
                { method: "PUT" },
            );
        }

        for (const currency of current.currencies) {
            if (!desiredCodes.has(currency.code)) {
                await backendRequest<BusinessCurrencyConfiguration>(
                    currencyPath(businessId, currency.code),
                    { method: "DELETE" },
                );
            }
        }

        const updated =
            await backendRequest<BusinessCurrencyConfiguration>(
                currencyPath(businessId),
            );
        return Response.json(normalizeCurrencyConfiguration(updated));
    } catch (error) {
        return backendErrorResponse(error);
    }
}
