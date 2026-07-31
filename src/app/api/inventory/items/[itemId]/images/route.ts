import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import {
    getInventoryBusinessId,
    itemImageError,
    readItemImageFiles,
} from "@/lib/api/inventory-backend";
import { type InventoryItem } from "@/lib/api/inventory";

type ItemRouteContext = {
    params: Promise<{ itemId: string }>;
};

/** Adds images to an item that already exists; they append to the gallery. */
export async function POST(
    request: Request,
    context: ItemRouteContext,
) {
    try {
        const { files, error } = readItemImageFiles(await request.formData());

        if (error) {
            return itemImageError(error);
        }

        if (!files.length) {
            return itemImageError("Choose at least one image to upload.");
        }

        const [{ itemId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);
        // Rebuilt so only the `files` parts the backend binds are forwarded.
        const upload = new FormData();

        for (const file of files) {
            upload.append("files", file, file.name);
        }

        const item = await backendRequest<InventoryItem>(
            `/api/v1/businesses/${businessId}/items/${encodeURIComponent(itemId)}/images`,
            { method: "POST", body: upload },
        );

        return Response.json(item);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
