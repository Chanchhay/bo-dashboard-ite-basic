import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import { getBusinessLogoError, type Business } from "@/lib/api/business";

const logoPath = (businessId: string) =>
    `/api/v1/businesses/${businessId}/logo`;

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File) || file.size === 0) {
            return Response.json(
                { message: "Choose a logo image to upload." },
                { status: 400 },
            );
        }

        const fileError = getBusinessLogoError(file);

        if (fileError) {
            return Response.json({ message: fileError }, { status: 400 });
        }

        const businessId = await getCurrentBusinessId();
        // Rebuild the payload so only the `file` part the backend expects is
        // forwarded, whatever else the browser sent.
        const upload = new FormData();
        upload.append("file", file, file.name);

        const business = await backendRequest<Business>(
            logoPath(businessId),
            { method: "POST", body: upload },
        );

        return Response.json(business);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function DELETE() {
    try {
        const businessId = await getCurrentBusinessId();
        const business = await backendRequest<Business>(
            logoPath(businessId),
            { method: "DELETE" },
        );

        return Response.json(business);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
