import { z } from "zod";

import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import type { Business } from "@/lib/api/business";
import type { ImageUploadRules } from "@/lib/api/image-upload";

type CurrentBusiness = {
    id: string;
};


export async function getCurrentBusinessId() {
    const business = await backendRequest<CurrentBusiness>(
        "/api/v1/businesses/me",
    );

    return encodeURIComponent(business?.id);
}


export function businessImageRoutes({
    segment,
    rules,
    missingMessage,
}: {
    segment: "logo" | "thumbnail";
    rules: ImageUploadRules;
    missingMessage: string;
}) {
    const path = (businessId: string) =>
        `/api/v1/businesses/${businessId}/${segment}`;

    return {
        async POST(request: Request) {
            try {
                const formData = await request.formData();
                const file = formData.get("file");

                if (!(file instanceof File) || file.size === 0) {
                    return Response.json(
                        { message: missingMessage },
                        { status: 400 },
                    );
                }

                const fileError = rules.validate(file);

                if (fileError) {
                    return Response.json(
                        { message: fileError },
                        { status: 400 },
                    );
                }

                const businessId = await getCurrentBusinessId();
                
                
                const upload = new FormData();
                upload.append("file", file, file.name);

                const business = await backendRequest<Business>(
                    path(businessId),
                    { method: "POST", body: upload },
                );

                return Response.json(business);
            } catch (error) {
                return backendErrorResponse(error);
            }
        },

        async DELETE() {
            try {
                const businessId = await getCurrentBusinessId();
                const business = await backendRequest<Business>(
                    path(businessId),
                    { method: "DELETE" },
                );

                return Response.json(business);
            } catch (error) {
                return backendErrorResponse(error);
            }
        },
    };
}

export function validationErrorResponse(error: z.ZodError, message: string) {
    return Response.json(
        {
            message,
            fieldErrors: z.flattenError(error).fieldErrors,
        },
        { status: 400 },
    );
}
