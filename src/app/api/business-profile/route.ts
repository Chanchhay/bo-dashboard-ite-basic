import { z } from "zod";

import {
    backendErrorResponse,
    backendRequest,
    readJsonBody,
} from "@/lib/api/backend";
import {
    businessProfileSchema,
    toUpdateBusinessInput,
    type Business,
} from "@/lib/api/business";

export async function GET() {
    try {
        const business = await backendRequest<Business>(
            "/api/v1/businesses/me",
        );
        return Response.json(business);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function PUT(request: Request) {
    try {
        const result = businessProfileSchema.safeParse(await readJsonBody(request));

        if (!result.success) {
            return Response.json(
                {
                    message: "Check the submitted business profile.",
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
                body: JSON.stringify(
                    toUpdateBusinessInput(result.data, business),
                ),
            },
        );

        return Response.json(updatedBusiness);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
