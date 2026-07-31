import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import { blockImageRules, type UploadedAsset } from "@/lib/api/inventory";

/**
 * Uploads one loose image and answers with its URL.
 *
 * Every other upload in the app belongs to something — a logo, an avatar, an
 * item's gallery. A picture inside a description block belongs to none of them:
 * it lives in the block's JSON, so it needs a plain "store this, hand me back a
 * URL" call.
 */
export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File) || file.size === 0) {
            return Response.json(
                { message: "Choose an image to upload." },
                { status: 400 },
            );
        }

        const fileError = blockImageRules.validate(file);

        if (fileError) {
            return Response.json({ message: fileError }, { status: 400 });
        }

        const businessId = await getCurrentBusinessId();
        const upload = new FormData();
        upload.append("file", file, file.name);

        const asset = await backendRequest<UploadedAsset>(
            `/api/v1/businesses/${businessId}/assets`,
            { method: "POST", body: upload },
        );

        return Response.json(asset);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
