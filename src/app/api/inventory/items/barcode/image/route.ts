import { backendErrorResponse } from "@/lib/api/backend";
import {
    getInventoryBusinessId,
    inventoryBarcodeImageResponse,
} from "@/lib/api/inventory-backend";

export async function GET(request: Request) {
    try {
        const requestUrl = new URL(request.url);
        const code = requestUrl.searchParams.get("code")?.trim();

        if (!code) {
            return Response.json(
                { message: "A barcode value is required." },
                { status: 400 },
            );
        }

        const query = new URLSearchParams({ code });

        for (const dimension of ["width", "height"] as const) {
            const value = requestUrl.searchParams.get(dimension);

            if (value !== null) {
                query.set(dimension, value);
            }
        }

        const businessId = await getInventoryBusinessId();

        return inventoryBarcodeImageResponse(
            `/api/v1/businesses/${businessId}/items/barcode/image?${query}`,
            "barcode.png",
        );
    } catch (error) {
        return backendErrorResponse(error);
    }
}
