import { z } from "zod";

import { backendRequest } from "@/lib/api/backend";

type CurrentBusiness = {
    id: string;
};

/** The signed-in user's business, URL-encoded for path interpolation. */
export async function getCurrentBusinessId() {
    const business = await backendRequest<CurrentBusiness>(
        "/api/v1/businesses/me",
    );

    return encodeURIComponent(business.id);
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
