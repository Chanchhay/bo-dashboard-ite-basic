import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getInventoryBusinessId } from "@/lib/api/inventory-backend";
import {
    IMPORT_TARGET_TYPES,
    type ImportSample,
    type ImportTargetType,
} from "@/lib/api/data-import";

/**
 * The starting files on offer for one kind of import.
 *
 * A static segment, so Next.js matches it ahead of `[importId]` rather than
 * treating "samples" as an import to look up.
 */
export async function GET(request: Request) {
    try {
        const targetType = new URL(request.url).searchParams.get(
            "targetType",
        ) as ImportTargetType | null;

        if (!targetType || !IMPORT_TARGET_TYPES.includes(targetType)) {
            return Response.json(
                { message: "Choose what kind of import you are doing." },
                { status: 400 },
            );
        }

        const businessId = await getInventoryBusinessId();

        return Response.json(
            await backendRequest<ImportSample[]>(
                `/api/v1/businesses/${businessId}/imports/samples?targetType=${encodeURIComponent(targetType)}`,
            ),
        );
    } catch (error) {
        return backendErrorResponse(error);
    }
}
