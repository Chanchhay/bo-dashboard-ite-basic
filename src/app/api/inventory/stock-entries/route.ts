import {
    backendErrorResponse,
    backendRequest,
    readJsonBody,
} from "@/lib/api/backend";
import {
    getInventoryBusinessId,
    inventoryValidationError,
} from "@/lib/api/inventory-backend";
import {
    stockEntrySchema,
    toStockEntryRequest,
    type StockEntry,
} from "@/lib/api/inventory";

export async function GET() {
    try {
        const businessId = await getInventoryBusinessId();
        const entries = await backendRequest<StockEntry[]>(
            `/api/v1/businesses/${businessId}/stock-entries`,
        );

        return Response.json(entries);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const result = stockEntrySchema.safeParse(await readJsonBody(request));

        if (!result.success) {
            return inventoryValidationError(result.error);
        }

        const businessId = await getInventoryBusinessId();
        const entry = await backendRequest<StockEntry>(
            `/api/v1/businesses/${businessId}/stock-entries`,
            {
                method: "POST",
                body: JSON.stringify(toStockEntryRequest(result.data)),
            },
        );

        return Response.json(entry, { status: 201 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
