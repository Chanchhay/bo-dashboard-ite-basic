import { z } from "zod";

import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import {
    taxSettingsSchema,
    toUpdateBusinessTaxInput,
    type Business,
} from "@/lib/api/business";

export async function PUT(request: Request) {
    try {
        const result = taxSettingsSchema.safeParse(await request.json());

        if (!result.success) {
            return Response.json(
                {
                    message: "Check the submitted tax settings.",
                    fieldErrors: z.flattenError(result.error).fieldErrors,
                },
                { status: 400 },
            );
        }

        const business = await backendRequest<Business>(
            "/api/v1/businesses/me",
        );
        const updatedBusiness = await backendRequest<Business>(
            `/api/v1/businesses/${encodeURIComponent(business.id)}`,
            {
                method: "PUT",
                body: JSON.stringify(toUpdateBusinessTaxInput(result.data)),
            },
        );

        return Response.json(updatedBusiness);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
