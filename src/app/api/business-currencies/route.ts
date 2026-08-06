import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import type { Business } from "@/lib/api/business";
import {
    businessCurrencyConfigurationSchema,
    normalizeCurrencyConfiguration,
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

        const desired = result.data;
        const businessId = await getBusinessId();

        // One atomic call: the backend owns the ordering and rebasing, so a
        // failure here leaves the configuration untouched rather than half
        // applied. The currency list is the desired end state — codes left out
        // of it are removed.
        const updated = await backendRequest<BusinessCurrencyConfiguration>(
            `${currencyPath(businessId)}/configuration`,
            {
                method: "PUT",
                body: JSON.stringify({
                    baseCurrency: desired.baseCurrency,
                    displayCurrency:
                        desired.displayCurrency || desired.baseCurrency,
                    currencies: desired.currencies.map((currency) => ({
                        code: currency.code,
                        name: currency.name,
                        symbol: currency.symbol,
                        exchangeRate: currency.exchangeRate,
                        decimalPlaces: currency.decimalPlaces,
                    })),
                }),
            },
        );

        return Response.json(normalizeCurrencyConfiguration(updated));
    } catch (error) {
        return backendErrorResponse(error);
    }
}
